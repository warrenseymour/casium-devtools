export type Command = [string, {}];

export interface Message {
  id: string;
  name: string;
  context: string;
  ts: number;
  prev: any;
  next: any;
  from: string;
  relay: any;
  message: string;
  data: any;
  path: string[];
  commands?: Command[];
}
