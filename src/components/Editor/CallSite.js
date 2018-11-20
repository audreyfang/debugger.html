/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// @flow
import React, { Component } from "react";
import ReactDOM from "react-dom";

import { addWidget, getTokenLocation } from "../../utils/editor";
import "./CallSite.css";

import Svg from "../shared/Svg";
import { isEqualWith } from "lodash";
import { isWasm } from "../../utils/wasm";

type MarkerType = {
  clear: Function
};

function getCallSiteAtLocation(callSites, location) {
  return callSites.find(callSite =>
    isEqualWith(callSite.location, location, (cloc, loc) => {
      return (
        loc.line === cloc.start.line &&
        (loc.column >= cloc.start.column && loc.column <= cloc.end.column)
      );
    })
  );
}

type Props = {
  callSite: Object,
  editor: Object,
  source: Object,
  breakpoint: Object,
  showCallSite: boolean,
  selectedLocation: Object,
  addBreakpoint: Function,
  removeBreakpoint: Function,
  selectedSource: Object,
  callSites: Array<Symbol>
};

export default class CallSite extends Component<Props> {
  addCallSite: Function;
  marker: ?MarkerType;

  constructor() {
    super();

    this.marker = undefined;
  }

  addCallSite = (nextProps: ?Props) => {
    const { editor, callSite } = nextProps || this.props;
    const className = !callSite.breakpoint ? "call-site" : "call-site-bp";
    const svgName = "column-marker";
    const node = document.createElement("div");
    ReactDOM.render(<Svg name={svgName} />, node);
    node.className = `column-marker-svg ${className}`;
    node.addEventListener("click", e => this.onClick(e));
    this.marker = addWidget(editor, node, {
      line: callSite.location.start.line - 1,
      ch: callSite.location.start.column
    });
  };

  onClick(e) {
    const { target } = e;
    const { editor, selectedLocation } = this.props;

    const { sourceId } = selectedLocation;
    const { line, column } = getTokenLocation(editor.codeMirror, target);

    this.toggleBreakpoint(line, isWasm(sourceId) ? undefined : column);
  }

  toggleBreakpoint(line, column = undefined) {
    const {
      selectedSource,
      selectedLocation,
      addBreakpoint,
      removeBreakpoint,
      callSites
    } = this.props;

    const callSite = getCallSiteAtLocation(callSites, { line, column });

    if (!callSite) {
      return;
    }

    const bp = callSite.breakpoint;

    if ((bp && bp.loading) || !selectedLocation || !selectedSource) {
      return;
    }

    const { sourceId } = selectedLocation;

    if (bp) {
      // NOTE: it's possible the breakpoint has slid to a column
      column = column || bp.location.column;
      removeBreakpoint({
        sourceId: sourceId,
        line: line,
        column
      });
    } else {
      addBreakpoint({
        sourceId: sourceId,
        sourceUrl: selectedSource.url,
        line: line,
        column: column
      });
    }
  }
  clearCallSite = () => {
    if (this.marker) {
      this.marker.clear();
      this.marker = null;
    }
  };

  shouldComponentUpdate(nextProps: Props) {
    return this.props.editor !== nextProps.editor;
  }

  componentDidMount() {
    const { breakpoint, showCallSite } = this.props;

    if (!breakpoint && !showCallSite) {
      return;
    }

    this.addCallSite();
  }

  componentWillReceiveProps(nextProps: Props) {
    const { breakpoint, showCallSite } = this.props;

    if (nextProps.breakpoint !== breakpoint) {
      if (this.marker) {
        this.clearCallSite();
      }
      if (nextProps.showCallSite) {
        this.addCallSite(nextProps);
      }
    }

    if (nextProps.showCallSite !== showCallSite) {
      if (nextProps.showCallSite) {
        if (!this.marker) {
          this.addCallSite();
        }
      } else if (!nextProps.breakpoint) {
        this.clearCallSite();
      }
    }
  }

  componentWillUnmount() {
    if (!this.marker) {
      return;
    }
    this.marker.clear();
  }

  render() {
    return null;
  }
}
