import { httpsCallable } from "firebase/functions";
import { cloudFunctions } from "./firebase";

export interface WalletTransaction {
  id: string;
  type: "funding" | "application";
  slotCount: number;
  amountNaira: number;
  status: string;
  createdAt: number;
  description: string;
}

export interface WalletSummary {
  slotBalance: number;
  slotUnitAmountKobo: number;
  minimumSlotPurchase: number;
  maximumSlotPurchase: number;
  paymentsEnabled: boolean;
  transactions: WalletTransaction[];
}

export const getWalletSummary = async () =>
  (await httpsCallable<Record<string, never>, WalletSummary>(cloudFunctions, "getWalletSummary")({})).data;

export const initializeSlotPayment = async (slotCount: number) =>
  (await httpsCallable<{ slotCount: number; callbackUrl: string }, { transactionId: string; reference: string; authorizationUrl: string }>(cloudFunctions, "initializeSlotPayment")({ slotCount, callbackUrl: `${location.origin}/app/#wallet` })).data;

export const verifySlotPayment = async (transactionId: string) =>
  (await httpsCallable<{ transactionId: string }, { transactionId: string; status: string; credited: boolean }>(cloudFunctions, "verifySlotPayment")({ transactionId })).data;
