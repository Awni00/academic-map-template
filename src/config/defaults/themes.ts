import type { Theme } from "../types";
import { defineTheme } from "../../lib/theme/defineTheme";

/**
 * The themes that ship with the template.
 *
 * Each is a port of a well-known open-source palette, with one deliberate
 * departure: roles that carry small text are shifted in lightness (hue and
 * saturation held) until they clear the WCAG target for their job. Editor
 * themes are tuned for monospace at a comfortable zoom, and several of them —
 * the light ones especially — fall below AA when reused for a 17px serif body
 * on a wide measure. Every value moved this way is marked `tuned from`.
 *
 * The dark palettes needed no changes at all; the light ones needed between
 * one and nineteen. `npm run validate` re-checks all of this, so a bad edit
 * here fails the build rather than shipping quietly.
 *
 * Each theme also states six chart colours, `figure-1` … `figure-6`: slot 1
 * near the theme's accent hue, then blue, ochre, teal, violet, green and red in
 * that order, skipping any too close to slot 1. Lightness was fitted per theme
 * so every slot clears 3:1 on `bg`, neighbours stay apart for colour-blind
 * readers, and white text reads on a slot's strong fill. Their companion
 * shades and the neutral are derived (see `src/lib/theme/figureColors.ts`).
 *
 * A site can add to this list without forking it — see `src/site/themes.ts`.
 * Defining a theme there with an id used here replaces this one.
 */
export const builtInThemes: readonly Theme[] = [
  defineTheme({
    id: "paper",
    label: "Paper",
    appearance: "light",
    shiki: "github-light-default",
    colors: {
      bg: "#ffffff",
      "bg-soft": "#faf9f6",
      "bg-soft-2": "#f5f4ef",

      fg: "#15161a",
      "fg-soft": "#2b2c30",
      muted: "#6b6d72",
      "muted-2": "#8e9095",

      border: "#e8e6e0",
      "border-soft": "#f0eee8",
      rule: "#d8d6d0",

      accent: "#2c5cc5",
      "accent-soft": "#eaf0fd",
      "accent-line": "#c8d6f3",

      danger: "#b91c1c",
      "danger-text": "#b91c1c",
      warning: "#b45309",
      "warning-text": "#b45309",
      success: "#15803d",
      "success-text": "#15803d",
      info: "#0f766e",
      "info-text": "#0f766e",
      example: "#9333ea",
      "example-text": "#9333ea",
      quote: "#8e9095",
      "quote-text": "#6b6d72",

      "graph-hub": "#15161a",
      "graph-sub-hub": "#7a808a",
      "graph-paper": "#2c5cc5",
      "graph-post": "#64748b",
      "graph-note": "#8596ae", // tuned from #94a3b8
      "graph-teaching": "#15803d",
      "graph-project": "#9333ea",
      "graph-edge": "#b8b6b0",

      "figure-1": "#2c5cc5",
      "figure-2": "#9d6d03",
      "figure-3": "#00877d",
      "figure-4": "#8a5bc4",
      "figure-5": "#208744",
      "figure-6": "#9b1f1c",

      "placeholder-a": "#efece5",
      "placeholder-b": "#e6e3dc"
    }
  }),
  defineTheme({
    id: "ink",
    label: "Ink",
    appearance: "dark",
    shiki: "github-dark-default",
    colors: {
      bg: "#0c0d10",
      "bg-soft": "#131418",
      "bg-soft-2": "#1a1c21",

      fg: "#f1f0ec",
      "fg-soft": "#d8d6d0",
      muted: "#9a9b9f",
      "muted-2": "#74757a",

      border: "#2a2b30",
      "border-soft": "#1f2024",
      rule: "#35363b",

      accent: "#8ea7ff",
      "accent-soft": "#1c2440",
      "accent-line": "#2e3a66",

      danger: "#f87171",
      "danger-text": "#f87171",
      warning: "#d6a14a",
      "warning-text": "#d6a14a",
      success: "#4ade80",
      "success-text": "#4ade80",
      info: "#5ccfe6",
      "info-text": "#5ccfe6",
      example: "#c084fc",
      "example-text": "#c084fc",
      quote: "#9a9b9f",
      "quote-text": "#9a9b9f",

      "graph-hub": "#f1f0ec",
      "graph-sub-hub": "#a1a1aa",
      "graph-paper": "#8ea7ff",
      "graph-post": "#7dd3fc",
      "graph-note": "#71717a",
      "graph-teaching": "#4ade80",
      "graph-project": "#c084fc",
      "graph-edge": "#4a4b50",

      "figure-1": "#8ea7ff",
      "figure-2": "#d5a049",
      "figure-3": "#4ec3da",
      "figure-4": "#b37ee9",
      "figure-5": "#53cd7c",
      "figure-6": "#e36364",

      "placeholder-a": "#1f2024",
      "placeholder-b": "#25262b"
    }
  }),
  defineTheme({
    id: "ember-light",
    label: "Ember Light",
    appearance: "light",
    shiki: "github-light-default",
    colors: {
      bg: "#ffffff",
      "bg-soft": "#faf9f6",
      "bg-soft-2": "#f5f4ef",

      fg: "#15161a",
      "fg-soft": "#2b2c30",
      muted: "#6b6d72",
      "muted-2": "#8e9095",

      border: "#e8e6e0",
      "border-soft": "#f0eee8",
      rule: "#d8d6d0",

      accent: "#b3401a",
      "accent-soft": "#f7ece8",
      "accent-line": "#eacabf",
      // Links stay blue, so they read as links against the warm interface.
      link: "#2456b8",

      danger: "#b91c1c",
      "danger-text": "#b91c1c",
      warning: "#b45309",
      "warning-text": "#b45309",
      success: "#15803d",
      "success-text": "#15803d",
      info: "#0f766e",
      "info-text": "#0f766e",
      example: "#9333ea",
      "example-text": "#9333ea",
      quote: "#8e9095",
      "quote-text": "#6b6d72",

      "graph-hub": "#15161a",
      "graph-sub-hub": "#7a808a",
      "graph-paper": "#b3401a",
      "graph-post": "#64748b",
      "graph-note": "#8596ae", // tuned from #94a3b8
      "graph-teaching": "#15803d",
      "graph-project": "#9333ea",
      "graph-edge": "#b8b6b0",

      "figure-1": "#b3401a",
      "figure-2": "#2657b6",
      "figure-3": "#9d6d03",
      "figure-4": "#00877d",
      "figure-5": "#8a5bc4",
      "figure-6": "#097b38",

      "placeholder-a": "#efece5",
      "placeholder-b": "#e6e3dc"
    }
  }),
  defineTheme({
    id: "ember-dark",
    label: "Ember Dark",
    appearance: "dark",
    shiki: "github-dark-default",
    colors: {
      bg: "#0c0d10",
      "bg-soft": "#131418",
      "bg-soft-2": "#1a1c21",

      fg: "#f1f0ec",
      "fg-soft": "#d8d6d0",
      muted: "#9a9b9f",
      "muted-2": "#74757a",

      border: "#2a2b30",
      "border-soft": "#1f2024",
      rule: "#35363b",

      accent: "#f0915f",
      "accent-soft": "#2c1f1b",
      "accent-line": "#503528",
      // Links stay blue, so they read as links against the warm interface.
      link: "#8eb0ff",

      danger: "#f87171",
      "danger-text": "#f87171",
      warning: "#d6a14a",
      "warning-text": "#d6a14a",
      success: "#4ade80",
      "success-text": "#4ade80",
      info: "#5ccfe6",
      "info-text": "#5ccfe6",
      example: "#c084fc",
      "example-text": "#c084fc",
      quote: "#9a9b9f",
      "quote-text": "#9a9b9f",

      "graph-hub": "#f1f0ec",
      "graph-sub-hub": "#a1a1aa",
      "graph-paper": "#f0915f",
      "graph-post": "#7dd3fc",
      "graph-note": "#71717a",
      "graph-teaching": "#4ade80",
      "graph-project": "#c084fc",
      "graph-edge": "#4a4b50",

      "figure-1": "#f0915f",
      "figure-2": "#8daffe",
      "figure-3": "#c48d25",
      "figure-4": "#4ec3da",
      "figure-5": "#b37ee9",
      "figure-6": "#53cd7c",

      "placeholder-a": "#1f2024",
      "placeholder-b": "#25262b"
    }
  }),
  defineTheme({
    id: "claret-light",
    label: "Claret Light",
    appearance: "light",
    shiki: "github-light-default",
    colors: {
      bg: "#ffffff",
      "bg-soft": "#faf9f6",
      "bg-soft-2": "#f5f4ef",

      fg: "#15161a",
      "fg-soft": "#2b2c30",
      muted: "#6b6d72",
      "muted-2": "#8e9095",

      border: "#e8e6e0",
      "border-soft": "#f0eee8",
      rule: "#d8d6d0",

      accent: "#8b1e3f",
      "accent-soft": "#f3e9ec",
      "accent-line": "#dfc0c9",
      // Navy links, so they read as links against the wine-red interface.
      link: "#1d4e89",

      danger: "#b91c1c",
      "danger-text": "#b91c1c",
      warning: "#b45309",
      "warning-text": "#b45309",
      success: "#15803d",
      "success-text": "#15803d",
      info: "#0f766e",
      "info-text": "#0f766e",
      example: "#9333ea",
      "example-text": "#9333ea",
      quote: "#8e9095",
      "quote-text": "#6b6d72",

      "graph-hub": "#15161a",
      "graph-sub-hub": "#7a808a",
      "graph-paper": "#8b1e3f",
      "graph-post": "#64748b",
      "graph-note": "#8596ae", // tuned from #94a3b8
      "graph-teaching": "#15803d",
      "graph-project": "#9333ea",
      "graph-edge": "#b8b6b0",

      "figure-1": "#8b1e3f",
      "figure-2": "#1c4d88",
      "figure-3": "#9d6d03",
      "figure-4": "#00877d",
      "figure-5": "#8a5bc4",
      "figure-6": "#097b38",

      "placeholder-a": "#efece5",
      "placeholder-b": "#e6e3dc"
    }
  }),
  defineTheme({
    id: "claret-dark",
    label: "Claret Dark",
    appearance: "dark",
    shiki: "github-dark-default",
    colors: {
      bg: "#0c0d10",
      "bg-soft": "#131418",
      "bg-soft-2": "#1a1c21",

      fg: "#f1f0ec",
      "fg-soft": "#d8d6d0",
      muted: "#9a9b9f",
      "muted-2": "#74757a",

      border: "#2a2b30",
      "border-soft": "#1f2024",
      rule: "#35363b",

      accent: "#e8879f",
      "accent-soft": "#2b1e24",
      "accent-line": "#4e323b",
      // Blue links, so they read as links against the rose interface.
      link: "#9cc0ff",

      danger: "#f87171",
      "danger-text": "#f87171",
      warning: "#d6a14a",
      "warning-text": "#d6a14a",
      success: "#4ade80",
      "success-text": "#4ade80",
      info: "#5ccfe6",
      "info-text": "#5ccfe6",
      example: "#c084fc",
      "example-text": "#c084fc",
      quote: "#9a9b9f",
      "quote-text": "#9a9b9f",

      "graph-hub": "#f1f0ec",
      "graph-sub-hub": "#a1a1aa",
      "graph-paper": "#e8879f",
      "graph-post": "#7dd3fc",
      "graph-note": "#71717a",
      "graph-teaching": "#4ade80",
      "graph-project": "#c084fc",
      "graph-edge": "#4a4b50",

      "figure-1": "#e8879f",
      "figure-2": "#91b5f4",
      "figure-3": "#d5a049",
      "figure-4": "#4ec3da",
      "figure-5": "#b37ee9",
      "figure-6": "#53cd7c",

      "placeholder-a": "#1f2024",
      "placeholder-b": "#25262b"
    }
  }),
  defineTheme({
    id: "pine-light",
    label: "Pine Light",
    appearance: "light",
    shiki: "github-light-default",
    colors: {
      bg: "#ffffff",
      "bg-soft": "#faf9f6",
      "bg-soft-2": "#f5f4ef",

      fg: "#15161a",
      "fg-soft": "#2b2c30",
      muted: "#6b6d72",
      "muted-2": "#8e9095",

      border: "#e8e6e0",
      "border-soft": "#f0eee8",
      rule: "#d8d6d0",

      accent: "#1f6f5c",
      "accent-soft": "#e9f1ef",
      "accent-line": "#c0d7d1",
      // Blue links, so they read as links against the green interface.
      link: "#2456b8",

      danger: "#b91c1c",
      "danger-text": "#b91c1c",
      warning: "#b45309",
      "warning-text": "#b45309",
      success: "#15803d",
      "success-text": "#15803d",
      info: "#0f766e",
      "info-text": "#0f766e",
      example: "#9333ea",
      "example-text": "#9333ea",
      quote: "#8e9095",
      "quote-text": "#6b6d72",

      "graph-hub": "#15161a",
      "graph-sub-hub": "#7a808a",
      "graph-paper": "#1f6f5c",
      "graph-post": "#64748b",
      "graph-note": "#8596ae", // tuned from #94a3b8
      "graph-teaching": "#15803d",
      "graph-project": "#9333ea",
      "graph-edge": "#b8b6b0",

      "figure-1": "#07715c",
      "figure-2": "#2657b6",
      "figure-3": "#9d6d03",
      "figure-4": "#8a5bc4",
      "figure-5": "#588021",
      "figure-6": "#9b1f1c",

      "placeholder-a": "#efece5",
      "placeholder-b": "#e6e3dc"
    }
  }),
  defineTheme({
    id: "pine-dark",
    label: "Pine Dark",
    appearance: "dark",
    shiki: "github-dark-default",
    colors: {
      bg: "#0c0d10",
      "bg-soft": "#131418",
      "bg-soft-2": "#1a1c21",

      fg: "#f1f0ec",
      "fg-soft": "#d8d6d0",
      muted: "#9a9b9f",
      "muted-2": "#74757a",

      border: "#2a2b30",
      "border-soft": "#1f2024",
      rule: "#35363b",

      accent: "#6fcfb0",
      "accent-soft": "#1a2826",
      "accent-line": "#2a4740",
      // Blue links, so they read as links against the green interface.
      link: "#8eb0ff",

      danger: "#f87171",
      "danger-text": "#f87171",
      warning: "#d6a14a",
      "warning-text": "#d6a14a",
      success: "#4ade80",
      "success-text": "#4ade80",
      info: "#5ccfe6",
      "info-text": "#5ccfe6",
      example: "#c084fc",
      "example-text": "#c084fc",
      quote: "#9a9b9f",
      "quote-text": "#9a9b9f",

      "graph-hub": "#f1f0ec",
      "graph-sub-hub": "#a1a1aa",
      "graph-paper": "#6fcfb0",
      "graph-post": "#7dd3fc",
      "graph-note": "#71717a",
      "graph-teaching": "#4ade80",
      "graph-project": "#c084fc",
      "graph-edge": "#4a4b50",

      "figure-1": "#66c6a8",
      "figure-2": "#8daffe",
      "figure-3": "#d5a049",
      "figure-4": "#bd88f4",
      "figure-5": "#7aa549",
      "figure-6": "#ff9592",

      "placeholder-a": "#1f2024",
      "placeholder-b": "#25262b"
    }
  }),
  defineTheme({
    id: "indigo-light",
    label: "Indigo Light",
    appearance: "light",
    shiki: "github-light-default",
    colors: {
      bg: "#ffffff",
      "bg-soft": "#faf9f6",
      "bg-soft-2": "#f5f4ef",

      fg: "#15161a",
      "fg-soft": "#2b2c30",
      muted: "#6b6d72",
      "muted-2": "#8e9095",

      border: "#e8e6e0",
      "border-soft": "#f0eee8",
      rule: "#d8d6d0",

      accent: "#4b3fb3",
      "accent-soft": "#edecf7",
      "accent-line": "#cdc9ea",
      // Links keep the indigo; terms and note marks turn coral.
      annotation: "#b8432f",

      danger: "#b91c1c",
      "danger-text": "#b91c1c",
      warning: "#b45309",
      "warning-text": "#b45309",
      success: "#15803d",
      "success-text": "#15803d",
      info: "#0f766e",
      "info-text": "#0f766e",
      example: "#9333ea",
      "example-text": "#9333ea",
      quote: "#8e9095",
      "quote-text": "#6b6d72",

      "graph-hub": "#15161a",
      "graph-sub-hub": "#7a808a",
      "graph-paper": "#4b3fb3",
      "graph-post": "#64748b",
      "graph-note": "#8596ae", // tuned from #94a3b8
      "graph-teaching": "#15803d",
      "graph-project": "#9333ea",
      "graph-edge": "#b8b6b0",

      "figure-1": "#4b3fb3",
      "figure-2": "#9d6d03",
      "figure-3": "#249990",
      "figure-4": "#027132",
      "figure-5": "#810208",
      "figure-6": "#ac5107",

      "placeholder-a": "#efece5",
      "placeholder-b": "#e6e3dc"
    }
  }),
  defineTheme({
    id: "indigo-dark",
    label: "Indigo Dark",
    appearance: "dark",
    shiki: "github-dark-default",
    colors: {
      bg: "#0c0d10",
      "bg-soft": "#131418",
      "bg-soft-2": "#1a1c21",

      fg: "#f1f0ec",
      "fg-soft": "#d8d6d0",
      muted: "#9a9b9f",
      "muted-2": "#74757a",

      border: "#2a2b30",
      "border-soft": "#1f2024",
      rule: "#35363b",

      accent: "#a9a2ff",
      "accent-soft": "#222231",
      "accent-line": "#3b3a58",
      // Links keep the indigo; terms and note marks turn coral.
      annotation: "#ff9a85",

      danger: "#f87171",
      "danger-text": "#f87171",
      warning: "#d6a14a",
      "warning-text": "#d6a14a",
      success: "#4ade80",
      "success-text": "#4ade80",
      info: "#5ccfe6",
      "info-text": "#5ccfe6",
      example: "#c084fc",
      "example-text": "#c084fc",
      quote: "#9a9b9f",
      "quote-text": "#9a9b9f",

      "graph-hub": "#f1f0ec",
      "graph-sub-hub": "#a1a1aa",
      "graph-paper": "#a9a2ff",
      "graph-post": "#7dd3fc",
      "graph-note": "#71717a",
      "graph-teaching": "#4ade80",
      "graph-project": "#c084fc",
      "graph-edge": "#4a4b50",

      "figure-1": "#aea8fe",
      "figure-2": "#4c88d3",
      "figure-3": "#d5a049",
      "figure-4": "#32acc3",
      "figure-5": "#53cd7c",
      "figure-6": "#e36364",

      "placeholder-a": "#1f2024",
      "placeholder-b": "#25262b"
    }
  }),
  defineTheme({
    id: "dawn",
    label: "Rosé Pine Dawn",
    appearance: "light",
    shiki: "rose-pine-dawn",
    colors: {
      bg: "#faf4ed",
      "bg-soft": "#fffaf3",
      "bg-soft-2": "#f2e9e1",

      fg: "#534f74", // tuned from #575279
      "fg-soft": "#645d88", // tuned from #6a6390
      muted: "#716d8c", // tuned from #797593
      "muted-2": "#918b9f", // tuned from #9893a5

      border: "#e6dcd2",
      "border-soft": "#f0e7de",
      rule: "#dfd3c8",

      accent: "#286983",
      "accent-soft": "#e7eef1",
      "accent-line": "#b9d0d9",

      danger: "#b4637a",
      "danger-text": "#ad546e", // tuned from #b4637a
      warning: "#c97c15", // tuned from #ea9d34
      "warning-text": "#9f6311", // tuned from #ea9d34
      success: "#56949f",
      "success-text": "#467881", // tuned from #56949f
      info: "#56949f",
      "info-text": "#467881", // tuned from #56949f
      example: "#907aa9",
      "example-text": "#7f659c", // tuned from #907aa9
      quote: "#918b9f", // tuned from #9893a5
      "quote-text": "#716d8c",

      "graph-hub": "#575279",
      "graph-sub-hub": "#918b9f", // tuned from #9893a5
      "graph-paper": "#286983",
      "graph-post": "#56949f",
      "graph-note": "#918b9f", // tuned from #9893a5
      "graph-teaching": "#c97c15", // tuned from #ea9d34
      "graph-project": "#907aa9",
      "graph-edge": "#d6c9bd",

      "figure-1": "#066a8a",
      "figure-2": "#c17501",
      "figure-3": "#058379",
      "figure-4": "#9576b6",
      "figure-5": "#588021",
      "figure-6": "#b4637a",

      "placeholder-a": "#f2e9e1",
      "placeholder-b": "#e8dcd2"
    }
  }),
  defineTheme({
    id: "rose-pine",
    label: "Rosé Pine",
    appearance: "dark",
    shiki: "rose-pine",
    colors: {
      bg: "#191724",
      "bg-soft": "#1f1d2e",
      "bg-soft-2": "#26233a",

      fg: "#e0def4",
      "fg-soft": "#cecbe8",
      muted: "#908caa",
      "muted-2": "#6e6a86",

      border: "#2a2740",
      "border-soft": "#221f33",
      rule: "#3a3552",

      accent: "#c4a7e7",
      "accent-soft": "#2b2440",
      "accent-line": "#463a5e",

      danger: "#eb6f92",
      "danger-text": "#eb6f92",
      warning: "#f6c177",
      "warning-text": "#f6c177",
      success: "#9ccfd8",
      "success-text": "#9ccfd8",
      info: "#9ccfd8",
      "info-text": "#9ccfd8",
      example: "#c4a7e7",
      "example-text": "#c4a7e7",
      quote: "#908caa",
      "quote-text": "#908caa",

      "graph-hub": "#e0def4",
      "graph-sub-hub": "#908caa",
      "graph-paper": "#c4a7e7",
      "graph-post": "#9ccfd8",
      "graph-note": "#6e6a86",
      "graph-teaching": "#f6c177",
      "graph-project": "#eb6f92",
      "graph-edge": "#3a3552",

      "figure-1": "#c4a7e7",
      "figure-2": "#5591dd",
      "figure-3": "#e1ad63",
      "figure-4": "#35b4a7",
      "figure-5": "#60892c",
      "figure-6": "#ec7093",

      "placeholder-a": "#26233a",
      "placeholder-b": "#2f2b45"
    }
  }),
  defineTheme({
    id: "everforest-light",
    label: "Everforest Light",
    appearance: "light",
    shiki: "everforest-light",
    colors: {
      bg: "#fdf6e3",
      "bg-soft": "#f4f0d9",
      "bg-soft-2": "#efebd4",

      fg: "#4a565c", // tuned from #5c6a72
      "fg-soft": "#59656d", // tuned from #708089
      muted: "#677567", // tuned from #829181
      "muted-2": "#859283", // tuned from #939f91

      border: "#e0dcc7",
      "border-soft": "#eae6d2",
      rule: "#d5d1bb",

      accent: "#2d7298", // tuned from #3a94c5; clears 4.5:1 on accent-soft too
      "accent-soft": "#e7eff2",
      "accent-line": "#bcd7e3",

      danger: "#f85552",
      "danger-text": "#e20d09", // tuned from #f85552
      warning: "#ba8500", // tuned from #dfa000
      "warning-text": "#946a00", // tuned from #dfa000
      success: "#859801", // tuned from #8da101
      "success-text": "#6a7801", // tuned from #8da101
      info: "#33a077", // tuned from #35a77c
      "info-text": "#287f5f", // tuned from #35a77c
      example: "#dd61b7", // tuned from #df69ba
      "example-text": "#ca2b99", // tuned from #df69ba
      quote: "#859283", // tuned from #939f91
      "quote-text": "#677567",

      "graph-hub": "#5c6a72",
      "graph-sub-hub": "#859283", // tuned from #939f91
      "graph-paper": "#3a94c5",
      "graph-post": "#33a077", // tuned from #35a77c
      "graph-note": "#86937e", // tuned from #a6b0a0
      "graph-teaching": "#ba8500", // tuned from #dfa000
      "graph-project": "#dd61b7", // tuned from #df69ba
      "graph-edge": "#cdc8b0",

      "figure-1": "#23749e",
      "figure-2": "#b17f06",
      "figure-3": "#058379",
      "figure-4": "#8559b2",
      "figure-5": "#7f9104",
      "figure-6": "#b63b39",

      "placeholder-a": "#efebd4",
      "placeholder-b": "#e6e2cc"
    }
  }),
  defineTheme({
    id: "everforest-dark",
    label: "Everforest Dark",
    appearance: "dark",
    shiki: "everforest-dark",
    colors: {
      bg: "#2d353b",
      "bg-soft": "#343f44",
      "bg-soft-2": "#3d484d",

      fg: "#d3c6aa",
      "fg-soft": "#c2b799",
      muted: "#9da9a0",
      "muted-2": "#859289",

      border: "#414d52",
      "border-soft": "#374247",
      rule: "#4f585e",

      accent: "#a7c080",
      "accent-soft": "#333f38",
      "accent-line": "#4a5a44",

      danger: "#e67e80",
      "danger-text": "#e67e80",
      warning: "#dbbc7f",
      "warning-text": "#dbbc7f",
      success: "#83c092",
      "success-text": "#83c092",
      info: "#7fbbb3",
      "info-text": "#7fbbb3",
      example: "#d699b6",
      "example-text": "#d699b6",
      quote: "#9da9a0",
      "quote-text": "#9da9a0",

      "graph-hub": "#d3c6aa",
      "graph-sub-hub": "#9da9a0",
      "graph-paper": "#a7c080",
      "graph-post": "#7fbbb3",
      "graph-note": "#859289",
      "graph-teaching": "#dbbc7f",
      "graph-project": "#d699b6",
      "graph-edge": "#4f585e",

      "figure-1": "#a5c079",
      "figure-2": "#5e9ae7",
      "figure-3": "#d6b26a",
      "figure-4": "#54bfb4",
      "figure-5": "#ad80dd",
      "figure-6": "#e67e80",

      "placeholder-a": "#3d484d",
      "placeholder-b": "#475258"
    }
  }),
  defineTheme({
    id: "latte",
    label: "Catppuccin Latte",
    appearance: "light",
    shiki: "catppuccin-latte",
    colors: {
      bg: "#eff1f5",
      "bg-soft": "#e6e9ef",
      "bg-soft-2": "#dce0e8",

      fg: "#4c4f69",
      "fg-soft": "#5c5f77",
      muted: "#6a6d82", // tuned from #6c6f85
      "muted-2": "#878a9d", // tuned from #8c8fa1

      border: "#ccd0da",
      "border-soft": "#dce0e8",
      rule: "#bcc0cc",

      accent: "#185eeb", // tuned from #1e66f5; clears 4.5:1 on accent-soft too
      "accent-soft": "#e2e9fd",
      "accent-line": "#b7c8f8",

      danger: "#d20f39",
      "danger-text": "#d20f39",
      warning: "#c27b19", // tuned from #df8e1d
      "warning-text": "#996214", // tuned from #df8e1d
      success: "#3f9e2b", // tuned from #40a02b
      "success-text": "#327d22", // tuned from #40a02b
      info: "#1f98ae", // tuned from #209fb5
      "info-text": "#187889", // tuned from #209fb5
      example: "#8839ef",
      "example-text": "#8839ef",
      quote: "#878a9d", // tuned from #8c8fa1
      "quote-text": "#6a6d82",

      "graph-hub": "#4c4f69",
      "graph-sub-hub": "#878a9d", // tuned from #8c8fa1
      "graph-paper": "#1e66f5",
      "graph-post": "#1f98ae", // tuned from #209fb5
      "graph-note": "#868a9e", // tuned from #9ca0b0
      "graph-teaching": "#3f9e2b", // tuned from #40a02b
      "graph-project": "#8839ef",
      "graph-edge": "#bcc0cc",

      "figure-1": "#185eeb",
      "figure-2": "#ba7409",
      "figure-3": "#1493a9",
      "figure-4": "#7d58c2",
      "figure-5": "#429631",
      "figure-6": "#ab2f3c",

      "placeholder-a": "#dce0e8",
      "placeholder-b": "#ccd0da"
    }
  }),
  defineTheme({
    id: "mocha",
    label: "Catppuccin Mocha",
    appearance: "dark",
    shiki: "catppuccin-mocha",
    colors: {
      bg: "#1e1e2e",
      "bg-soft": "#181825",
      "bg-soft-2": "#313244",

      fg: "#cdd6f4",
      "fg-soft": "#bac2de",
      muted: "#a6adc8",
      "muted-2": "#7f849c",

      border: "#313244",
      "border-soft": "#282839",
      rule: "#45475a",

      accent: "#89b4fa",
      "accent-soft": "#1e2740",
      "accent-line": "#2f4066",

      danger: "#f38ba8",
      "danger-text": "#f38ba8",
      warning: "#f9e2af",
      "warning-text": "#f9e2af",
      success: "#a6e3a1",
      "success-text": "#a6e3a1",
      info: "#94e2d5",
      "info-text": "#94e2d5",
      example: "#cba6f7",
      "example-text": "#cba6f7",
      quote: "#a6adc8",
      "quote-text": "#a6adc8",

      "graph-hub": "#cdd6f4",
      "graph-sub-hub": "#9399b2",
      "graph-paper": "#89b4fa",
      "graph-post": "#94e2d5",
      "graph-note": "#6c7086",
      "graph-teaching": "#f9e2af",
      "graph-project": "#cba6f7",
      "graph-edge": "#45475a",

      "figure-1": "#89b4fa",
      "figure-2": "#d0b067",
      "figure-3": "#48b3a4",
      "figure-4": "#c9a4f5",
      "figure-5": "#6faa6b",
      "figure-6": "#f58ca9",

      "placeholder-a": "#313244",
      "placeholder-b": "#3b3d52"
    }
  }),
  defineTheme({
    id: "github-light",
    label: "GitHub Light",
    appearance: "light",
    shiki: "github-light-default",
    colors: {
      bg: "#ffffff",
      "bg-soft": "#f6f8fa",
      "bg-soft-2": "#eef1f4",

      fg: "#1f2328",
      "fg-soft": "#32383f",
      muted: "#59636e",
      "muted-2": "#818b98",

      border: "#d1d9e0",
      "border-soft": "#e4e8ec",
      rule: "#c4ccd4",

      accent: "#0969da",
      "accent-soft": "#ddf4ff",
      "accent-line": "#b6d8f5",

      danger: "#cf222e",
      "danger-text": "#cf222e",
      warning: "#9a6700",
      "warning-text": "#9a6700",
      success: "#1a7f37",
      "success-text": "#1a7f37",
      info: "#1b7c83",
      "info-text": "#1b7c83",
      example: "#8250df",
      "example-text": "#8250df",
      quote: "#818b98",
      "quote-text": "#59636e",

      "graph-hub": "#1f2328",
      "graph-sub-hub": "#818b98",
      "graph-paper": "#0969da",
      "graph-post": "#1b7c83",
      "graph-note": "#8a96a4", // tuned from #9aa5b1
      "graph-teaching": "#1a7f37",
      "graph-project": "#8250df",
      "graph-edge": "#c4ccd4",

      "figure-1": "#0969da",
      "figure-2": "#9f6c0c",
      "figure-3": "#07848c",
      "figure-4": "#805fca",
      "figure-5": "#2d8d44",
      "figure-6": "#a12629",

      "placeholder-a": "#eef1f4",
      "placeholder-b": "#e2e6ea"
    }
  }),
  defineTheme({
    id: "github-dark",
    label: "GitHub Dark",
    appearance: "dark",
    shiki: "github-dark-default",
    colors: {
      bg: "#0d1117",
      "bg-soft": "#151b23",
      "bg-soft-2": "#1c2129",

      fg: "#e6edf3",
      "fg-soft": "#d1d7de",
      muted: "#9198a1",
      "muted-2": "#6e7681",

      border: "#2a313c",
      "border-soft": "#20262d",
      rule: "#3d444d",

      accent: "#4493f8",
      "accent-soft": "#121d2f",
      "accent-line": "#1f3a5f",

      danger: "#f85149",
      "danger-text": "#f85149",
      warning: "#d29922",
      "warning-text": "#d29922",
      success: "#3fb950",
      "success-text": "#3fb950",
      info: "#39c5cf",
      "info-text": "#39c5cf",
      example: "#bc8cff",
      "example-text": "#bc8cff",
      quote: "#9198a1",
      "quote-text": "#9198a1",

      "graph-hub": "#e6edf3",
      "graph-sub-hub": "#8b949e",
      "graph-paper": "#4493f8",
      "graph-post": "#39c5cf",
      "graph-note": "#6e7681",
      "graph-teaching": "#3fb950",
      "graph-project": "#bc8cff",
      "graph-edge": "#3d444d",

      "figure-1": "#4493f8",
      "figure-2": "#d29922",
      "figure-3": "#3bc6d0",
      "figure-4": "#b78af7",
      "figure-5": "#52b85d",
      "figure-6": "#ce5249",

      "placeholder-a": "#1c2129",
      "placeholder-b": "#262c36"
    }
  })
];
