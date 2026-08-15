import { httpsCallable } from "firebase/functions";
import { cloudFunctions } from "./firebase";

export interface DirectoryCompany {
  id: string;
  name: string;
  username: string;
  logoUrl: string;
  industry: string;
  state: string;
  address: string;
  description: string;
  website: string;
  email: string;
  phoneNumber: string;
  verified: boolean;
  authorityName: string;
  opportunityCount: number;
}

export async function listPublicCompanies(): Promise<DirectoryCompany[]> {
  const callable = httpsCallable<Record<string, never>, {companies: DirectoryCompany[]}>(cloudFunctions, "listPublicCompanies");
  return (await callable({})).data.companies;
}
