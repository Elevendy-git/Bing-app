const profilePhoto = new URL("./assets/profile-photo.png", import.meta.url).href;

export interface ProfileAccount {
  name?: string;
  email?: string;
  imageSrc?: string;
}

/** Prototype fixtures only; a null account represents the signed-out state. */
export const PROFILE_ACCOUNTS = {
  image: { name: "Eleven", email: "Eleven@hotmail.com", imageSrc: profilePhoto },
  initials: { name: "Eleven", email: "Eleven@hotmail.com" },
  "signed-out": null,
} satisfies Record<string, ProfileAccount | null>;

export function profileAvatar(account: ProfileAccount | null) {
  const name = account?.name?.trim() || account?.email?.trim() || "";
  const initials = Array.from(name)[0]?.toLocaleUpperCase() || "";
  const imageSrc = account?.imageSrc?.trim();
  const variant: "image" | "initials" | "not-signed-in" = !account ? "not-signed-in"
    : imageSrc ? "image" : initials ? "initials" : "not-signed-in";
  return { variant, initials, imageSrc, fallbackInitials: initials };
}
