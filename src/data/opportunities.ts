export type Opportunity = {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  budget: string;
  durationHours: number;
  match: number;
  urgent?: boolean;
  client: string;
  description: string;
  reasons: string[];
  tags: string[];
};