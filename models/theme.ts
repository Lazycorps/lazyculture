export type Theme = {
  id: number;
  name: string;
  slug: string;
  picture: string;
  createDate: Date;
  updateDate: Date;
  userCreate: string;
  userUpdate: string;
};

export class ThemeDTO {
  id: number = 0;
  name: string = "";
  slug: string = "";
  picture: string = "";
  createDate: Date = new Date();
  updateDate: Date = new Date();
  userCreate: string = "";
  userUpdate: string = "";
};
