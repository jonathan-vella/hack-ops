export interface Config {
  id: string;
  _type: "config";
  key: string;
  value: string | number | boolean;
  updatedBy: string;
  updatedAt: string;
}
