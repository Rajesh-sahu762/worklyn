
import {
  House,
  Folder,
  Users,
  ChevronDown,
  Menu,
  X,
  PanelLeft,
  LogOut,
  Check,
  Search,
  Plus,
  Bell,
  CircleHelp,
  Settings,
  Clock,
  Star,
  UsersRound,
  ClipboardCheck,
} from "lucide-react";

const makeIcon = (Icon) => {
  return function AppIcon(props) {
    return (
      <Icon
        size={18}
        strokeWidth={1.75}
        aria-hidden="true"
        focusable="false"
        {...props}
      />
    );
  };
};

export const HomeIcon = makeIcon(House);
export const FolderIcon = makeIcon(Folder);
export const UsersIcon = makeIcon(Users);
export const ChevronIcon = makeIcon(ChevronDown);
export const MenuIcon = makeIcon(Menu);
export const CloseIcon = makeIcon(X);
export const PanelIcon = makeIcon(PanelLeft);
export const LogoutIcon = makeIcon(LogOut);
export const CheckIcon = makeIcon(Check);
export const SearchIcon = makeIcon(Search);
export const PlusIcon = makeIcon(Plus);
export const BellIcon = makeIcon(Bell);
export const HelpIcon = makeIcon(CircleHelp);
export const SettingsIcon = makeIcon(Settings);
export const ClockIcon = makeIcon(Clock);
export const StarIcon = makeIcon(Star);
export const TeamIcon = makeIcon(UsersRound);
export const IssueIcon = makeIcon(ClipboardCheck);
