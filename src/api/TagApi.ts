import { DataService } from "../config/dataService";
import { HttpStatusCode } from "axios";

export interface Tag {
  tagId: string; // UUID
  name: string;
  notes: string;
}

export interface TagCategory {
  tagCategoryId: string; // UUID
  name: string;
  notes: string;
  tags: Tag[];
}

export interface NewTagCategory {
  categoryName: string;
  categoryNotes: string;
  tagName: string;
  tagNotes: string;
}

export interface NewTagInCategory {
  tagCategoryId: string; // UUID
  tagName: string;
  tagNotes: string;
}

export default class TagApi extends DataService {
  async tags(): Promise<TagCategory[]> {
    const response = await this.client.get<TagCategory[]>("/tags");

    return response.data;
  }

  async newTagCategory(newTagCategory: NewTagCategory): Promise<boolean> {
    const response = await this.client.post('/tag-category', newTagCategory);

    return response.status === HttpStatusCode.Created
  }

  async newTagInCategory(tagCategoryId: string, newTagInCategory: NewTagInCategory): Promise<boolean> {
    newTagInCategory.tagCategoryId = tagCategoryId

    const response = await this.client.post('/tag', newTagInCategory);

    return response.status === HttpStatusCode.Created
  }
}
