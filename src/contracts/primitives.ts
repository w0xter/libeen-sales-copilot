import { z } from 'zod';

export const CONTRACT_VERSION = 'integration-contract-v0.1' as const;
export const Id = z.string().min(1);
export const Timestamp = z.iso.datetime({
  offset: true
});

export const Revision = z.number().int().nonnegative();
export const StringList = z.array(Id);
export const ConfigBundleRefSchema = z.strictObject({
  workflow: Id,
  factSchema: Id,
  agentProfile: Id,
  businessPolicy: Id,
  reviewPolicy: Id,
  actionCatalog: Id
});
export type ConfigBundleRef = z.infer<typeof ConfigBundleRefSchema>;
