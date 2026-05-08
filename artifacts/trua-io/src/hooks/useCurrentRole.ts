import { useQuery } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Membership = {
  memberId: number;
  role: string;
  clerkUserId: string;
};

async function fetchMyMembership(): Promise<Membership> {
  const res = await fetch(`${basePath}/api/org/my-membership`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch membership");
  return res.json();
}

export function useCurrentRole() {
  const { data } = useQuery({
    queryKey: ["my-membership"],
    queryFn: fetchMyMembership,
    staleTime: 5 * 60_000,
  });
  return data?.role ?? "sales_user";
}

export function useMyMembership() {
  return useQuery({
    queryKey: ["my-membership"],
    queryFn: fetchMyMembership,
    staleTime: 5 * 60_000,
  });
}
