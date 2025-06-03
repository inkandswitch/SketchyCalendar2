import { Id } from "id";
import { State } from "./notebook";

import { DocumentId } from "@automerge/automerge-repo";
import { Stroke } from "./ink";
import { Page } from "./page";
import { PaperInstance } from "./paperinstance";
import { Text } from "./text";

export type LinkableId = Id<Text | PaperInstance | Stroke | Page>;

export type TargetPage = {
  type: "page";
  id: Id<Page>;
  notebookDocId: DocumentId;
};

export type TargetUrl = {
  type: "url";
  url: string;
};

export type LinkTarget = TargetPage | TargetUrl;

export type LinkProps = {
  id: LinkableId;
  target: LinkTarget;
};

export class Link {
  #state: State;
  props: LinkProps;

  constructor(state: State, props: LinkProps) {
    this.#state = state;
    this.props = props;
  }

  getTarget(): Page | string {
    if (this.props.target.type === "page") {
      return this.#state.collection.getPageById(this.props.target.id)!;
    } else {
      return this.props.target.url;
    }
  }

  setTargetPage(targetPage: TargetPage): void {
    this.#state.docHandle.change((state) => {
      state.links[this.props.id].target = targetPage;
    });
    this.props.target = targetPage;
  }

  getSource(): Text | PaperInstance | Stroke {
    const source = this.#state.props.links[this.props.id];
    if (!source) {
      throw new Error(`Link with id ${this.props.id} not found`);
    }

    const sourceId = source.id;
    return this.#state.collection.getLinkableById(sourceId);
  }

  static fromId(state: State, id: LinkableId): Link {
    const props = state.props.links[id];
    return new Link(state, props);
  }

  static deleteWithId(state: State, id: LinkableId): void {
    state.docHandle.change((state) => {
      delete state.links[id];
    });
  }

  static create(state: State, props: LinkProps): Link {
    // Make sure this link does not already exist
    if (state.props.links[props.id]) {
      Link.deleteWithId(state, props.id);
    }

    state.docHandle.change((state) => {
      state.links[props.id] = props;
    });
    return new Link(state, props);
  }
}
