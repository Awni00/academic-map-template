import {
  BookOpen,
  Briefcase,
  Calendar,
  Code,
  FileText,
  FlaskConical,
  FolderOpen,
  Globe,
  GraduationCap,
  House,
  Library,
  Mail,
  Mic,
  Newspaper,
  NotebookPen,
  PenLine,
  Presentation,
  Rss,
  User,
  Waypoints
} from "@lucide/astro";

import type { NavIconName } from "../../config/navIcons";

/** The component for each name in `navIconNames`. */
export const navIcons: Record<NavIconName, typeof House> = {
  house: House,
  user: User,
  waypoints: Waypoints,
  "pen-line": PenLine,
  "notebook-pen": NotebookPen,
  newspaper: Newspaper,
  "book-open": BookOpen,
  library: Library,
  "flask-conical": FlaskConical,
  "graduation-cap": GraduationCap,
  presentation: Presentation,
  mic: Mic,
  briefcase: Briefcase,
  "folder-open": FolderOpen,
  code: Code,
  "file-text": FileText,
  calendar: Calendar,
  mail: Mail,
  globe: Globe,
  rss: Rss
};
