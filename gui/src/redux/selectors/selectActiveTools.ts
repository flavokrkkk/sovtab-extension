import { createSelector } from "@reduxjs/toolkit";
import { Tool } from "core";
import { RootState } from "../store";

/**
 * В облегчённой версии плагина инструменты (tools/MCP) не используются.
 * Селектор оставлен для совместимости, но всегда возвращает пустой список.
 */
export const selectActiveTools = createSelector(
  [(store: RootState) => store.session.mode],
  (_mode): Tool[] => {
    return [];
  },
);
