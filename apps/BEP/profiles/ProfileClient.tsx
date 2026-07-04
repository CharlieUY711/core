"use client";

import UserProfile from "@/components/profile/UserProfile";

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  role: string;
}

interface ProfileData {
  full_name: string;
  role: string;
  entity: string;
  department: string;
  phone: string;
  avatar_url: string;
}

interface Props {
  userId: string;
  userEmail: string;
  initialProfile: Partial<ProfileData>;
  projects: Project[];
}

export default function ProfileClient({ userId, userEmail, initialProfile, projects }: Props) {
  return (
    <UserProfile
      userId={userId}
      userEmail={userEmail}
      initialProfile={initialProfile}
      projects={projects}
    />
  );
}
