export type Occasion = {
  value: string;
  label: string;
};

export const OCCASIONS: Occasion[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "housewarming", label: "Housewarming" },
  { value: "just_because", label: "Just Because" },
  { value: "congratulations", label: "Congratulations" },
  { value: "thank_you", label: "Thank You" },
];
