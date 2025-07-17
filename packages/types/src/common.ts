interface Model {
  id: string;
  created_at: string;
  updated_at: string;
}

interface Status {
  status: string;
}

interface Control {
  action: string;
}

export type { Control, Model, Status };
