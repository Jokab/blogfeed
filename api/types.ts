export interface Blog {
  name: string;
  url: string;
}

export interface BlogPost {
  name: string;
  lastUpdateDate: Date;
  url: string | URL;
  title: string;
  id: string | number;
  clicked?: boolean;
}

export interface EllenBlogPost {
  addedOn: string;
  fullUrl: string;
  title: string;
  id: string;
}

export interface JuliaBlogPost {
  date: string;
  link: string;
  title: { rendered: string };
  id: number;
}

export interface RssItem {
  pubDate: string;
  link: string;
  title: string;
}

export interface ElleBlogPost {
  date: string;
  url: string;
  title: string;
  id: number;
}