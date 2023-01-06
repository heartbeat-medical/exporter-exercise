export interface UUID {
  NewUUID: () => string;
}

export const MockUUIDGen: UUID = {
  NewUUID: () => {
    return "AAAA";
  },
};
