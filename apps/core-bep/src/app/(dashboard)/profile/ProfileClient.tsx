"use client";

import dynamic from "next/dynamic";

const UserProfile = dynamic(
  () => import("@/components/profile/UserProfile"),
  { ssr: false }
);

interface Props {
  userId:    string;
  userEmail: string;
  userName:  string;
  userRole:  string;
}

export default function ProfileClient({ userId, userEmail, userName, userRole }: Props) {
  return (
    <UserProfile
      userId={userId}
      userEmail={userEmail}
      userRole={userRole}
      initialData={{ nombre: userName }}
      accentColor="#3D5689"
      storageKey="bep_profile"
    />
  );
}
