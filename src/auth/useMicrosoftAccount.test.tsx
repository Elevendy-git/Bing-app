import { StrictMode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountInfo, AuthenticationResult, IPublicClientApplication } from "@azure/msal-browser";
import { fetchMicrosoftProfile, getMicrosoftClient } from "./microsoftClient";
import { useMicrosoftAccount } from "./useMicrosoftAccount";

vi.mock("./microsoftClient", async original => ({
  ...await original<typeof import("./microsoftClient")>(),
  getMicrosoftClient: vi.fn(), fetchMicrosoftProfile: vi.fn(),
}));
const user = { homeAccountId: "personal-id", localAccountId: "id", environment: "login.microsoftonline.com", tenantId: "consumers", username: "test@outlook.com", name: "Test User" } satisfies AccountInfo;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = { account: user, accessToken: "test-only-token" } as AuthenticationResult;
let msal: IPublicClientApplication;
beforeEach(() => {
  msal = {
    getActiveAccount: vi.fn(() => null), getAllAccounts: vi.fn(() => []), setActiveAccount: vi.fn(),
    loginPopup: vi.fn(async () => response), clearCache: vi.fn(async () => undefined),
    acquireTokenSilent: vi.fn(async () => response),
  } as unknown as IPublicClientApplication;
  vi.mocked(getMicrosoftClient).mockResolvedValue(msal);
  vi.mocked(fetchMicrosoftProfile).mockResolvedValue({ account: { name: "Test User", email: user.username }, photo: null });
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:account-photo");
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("Microsoft account session", () => {
  it("initializes without an automatic popup, then calls login synchronously from one explicit action", async () => {
    const login = deferred<AuthenticationResult>();
    vi.mocked(msal.loginPopup).mockReturnValue(login.promise);
    const { result } = renderHook(useMicrosoftAccount, { wrapper: StrictMode });
    await waitFor(() => expect(result.current.authentication.pending).toBeNull());
    expect(result.current.account).toBeNull();
    expect(msal.loginPopup).not.toHaveBeenCalled();
    act(() => {
      result.current.authentication.onSignIn();
      expect(msal.loginPopup).toHaveBeenCalledWith({ scopes: ["User.Read"], prompt: "select_account" });
      result.current.authentication.onSignIn();
    });
    expect(msal.loginPopup).toHaveBeenCalledTimes(1);
    expect(result.current.authentication.pending).toBe("sign-in");
    await act(async () => login.resolve(response));
    await waitFor(() => expect(result.current.account?.email).toBe(user.username));
    expect(result.current.authentication.pending).toBeNull();
    expect(msal.setActiveAccount).toHaveBeenLastCalledWith(user);
    expect(fetchMicrosoftProfile).toHaveBeenCalledWith("test-only-token", user, expect.any(AbortSignal));
    expect(msal.acquireTokenSilent).not.toHaveBeenCalled();
  });

  it("restores a cached identity without prompting and tolerates unavailable Graph/token renewal", async () => {
    vi.mocked(msal.getActiveAccount).mockReturnValue(user);
    vi.mocked(msal.acquireTokenSilent).mockRejectedValue({ errorCode: "interaction_required" });
    const { result } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.account).toEqual({ name: user.name, email: user.username }));
    expect(msal.acquireTokenSilent).toHaveBeenCalledWith({ scopes: ["User.Read"], account: user });
    expect(msal.loginPopup).not.toHaveBeenCalled();
    expect(result.current.authentication.error).toBeNull();
  });

  it("keeps cancellation signed out, explains blocked popups, and allows a new attempt", async () => {
    vi.mocked(msal.loginPopup).mockRejectedValueOnce({ errorCode: "user_cancelled" })
      .mockRejectedValueOnce({ errorCode: "popup_window_error" });
    const { result } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.authentication.pending).toBeNull());
    await act(async () => result.current.authentication.onSignIn());
    expect(result.current.account).toBeNull();
    expect(result.current.authentication.error).toBeNull();
    await act(async () => result.current.authentication.onSignIn());
    expect(result.current.authentication.error).toMatch(/Allow pop-ups/);
    await act(async () => result.current.authentication.onSignIn());
    await waitFor(() => expect(result.current.account?.email).toBe(user.username));
    expect(result.current.authentication.error).toBeNull();
  });

  it("clears the app's account/tokens and ignores late Graph responses after sign-out", async () => {
    const graph = deferred<Awaited<ReturnType<typeof fetchMicrosoftProfile>>>();
    vi.mocked(fetchMicrosoftProfile).mockReturnValue(graph.promise);
    const { result } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.authentication.pending).toBeNull());
    await act(async () => result.current.authentication.onSignIn());
    expect(result.current.account?.email).toBe(user.username);
    const signal = vi.mocked(fetchMicrosoftProfile).mock.calls[0][2];
    await act(async () => result.current.authentication.onSignOut());
    expect(msal.clearCache).toHaveBeenCalledWith({ account: user });
    expect(msal.setActiveAccount).toHaveBeenLastCalledWith(null);
    expect(signal.aborted).toBe(true);
    await act(async () => graph.resolve({ account: { name: "Late response", email: user.username }, photo: new Blob(["photo"], { type: "image/jpeg" }) }));
    expect(result.current.account).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("owns and revokes photo URLs on sign-out and unmount", async () => {
    vi.mocked(fetchMicrosoftProfile).mockResolvedValue({ account: { name: user.name, email: user.username }, photo: new Blob(["photo"], { type: "image/jpeg" }) });
    const { result, unmount } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.authentication.pending).toBeNull());
    await act(async () => result.current.authentication.onSignIn());
    expect(result.current.account?.imageSrc).toBe("blob:account-photo");
    await act(async () => result.current.authentication.onSignOut());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:account-photo");
    await act(async () => result.current.authentication.onSignIn());
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("can retry initialization without asynchronously opening a blocked login window", async () => {
    vi.mocked(getMicrosoftClient).mockRejectedValueOnce(new Error("Offline"));
    const { result } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.authentication.error).toMatch(/couldn't start/));
    await act(async () => result.current.authentication.onSignIn());
    await waitFor(() => expect(result.current.authentication.pending).toBeNull());
    expect(result.current.authentication.error).toBeNull();
    expect(msal.loginPopup).not.toHaveBeenCalled();
    await act(async () => result.current.authentication.onSignIn());
    expect(result.current.account?.email).toBe(user.username);
  });

  it("only overrides an abandoned popup on explicit retry and ignores the superseded request", async () => {
    const first = deferred<AuthenticationResult>();
    const retry = deferred<AuthenticationResult>();
    vi.mocked(msal.loginPopup).mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
    const { result } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.authentication.pending).toBeNull());
    act(() => result.current.authentication.onSignIn());
    act(() => result.current.authentication.onRetrySignIn?.());
    expect(msal.loginPopup).toHaveBeenLastCalledWith({ scopes: ["User.Read"], prompt: "select_account", overrideInteractionInProgress: true });
    await act(async () => first.reject({ errorCode: "interaction_in_progress_cancelled" }));
    expect(result.current.authentication.error).toBeNull();
    expect(result.current.authentication.pending).toBe("sign-in");
    act(() => result.current.authentication.onSignIn());
    expect(msal.loginPopup).toHaveBeenCalledTimes(2);
    await act(async () => retry.resolve(response));
    expect(result.current.account?.email).toBe(user.username);
    expect(result.current.authentication.pending).toBeNull();
  });

  it("clears tokens after an in-flight silent renewal, so sign-out cannot refill the cache", async () => {
    const renewal = deferred<AuthenticationResult>();
    vi.mocked(msal.getActiveAccount).mockReturnValue(user);
    vi.mocked(msal.acquireTokenSilent).mockReturnValue(renewal.promise);
    const { result } = renderHook(useMicrosoftAccount);
    await waitFor(() => expect(result.current.account?.email).toBe(user.username));
    act(() => result.current.authentication.onSignOut());
    expect(result.current.authentication.pending).toBe("sign-out");
    expect(msal.clearCache).not.toHaveBeenCalled();
    await act(async () => renewal.resolve(response));
    await waitFor(() => expect(result.current.account).toBeNull());
    expect(msal.clearCache).toHaveBeenCalledWith({ account: user });
    expect(fetchMicrosoftProfile).not.toHaveBeenCalled();
  });
});
