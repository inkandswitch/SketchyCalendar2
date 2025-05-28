import { Id } from "id";
import { State } from "./notebook";

import { DocumentId } from "@automerge/automerge-repo";
import { Stroke } from "./ink";
import { Page } from "./page";
import { PaperInstance } from "./paperinstance";
import { Text } from "./text";

export type LinkableId = Id<Text | PaperInstance | Stroke | Page>;

export type TargetPage = {
  id: Id<Page>;
  notebookDocId: DocumentId;
};

export type LinkProps = {
  id: LinkableId;
  targetPage: TargetPage;
};

export class Link {
  #state: State;
  props: LinkProps;

  constructor(state: State, props: LinkProps) {
    this.#state = state;
    this.props = props;
  }

  getTargetPage(): Page {
    return Page.fromId(this.#state, this.props.targetPage.id);
  }

  static fromId(state: State, id: LinkableId): Link {
    const props = state.props.links[id];
    return new Link(state, props);
  }

  static create(state: State, props: LinkProps): Link {
    state.docHandle.change((state) => {
      state.links[props.id] = props;
    });
    return new Link(state, props);
  }
}
