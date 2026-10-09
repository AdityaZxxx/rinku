import { type ComponentType } from "react";
import {
  EnvelopeSimpleIcon,
  FacebookLogoIcon,
  LinkedinLogoIcon,
  RedditLogoIcon,
  TelegramLogoIcon,
  WhatsappLogoIcon,
  XLogoIcon,
} from "@phosphor-icons/react";

export interface ShareTarget {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  href: (url: string, text: string) => string;
}

/** Where a shareable URL can be sent; pages and individual links both use it. */
export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: "x",
    label: "X",
    Icon: XLogoIcon,
    href: (url, text) => `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
  },
  {
    id: "facebook",
    label: "Facebook",
    Icon: FacebookLogoIcon,
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    Icon: WhatsappLogoIcon,
    href: (url, text) => `https://wa.me/?text=${text}%20${url}`,
  },
  {
    id: "telegram",
    label: "Telegram",
    Icon: TelegramLogoIcon,
    href: (url, text) => `https://t.me/share/url?url=${url}&text=${text}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    Icon: LinkedinLogoIcon,
    href: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  },
  {
    id: "reddit",
    label: "Reddit",
    Icon: RedditLogoIcon,
    href: (url, text) => `https://www.reddit.com/submit?url=${url}&title=${text}`,
  },
  {
    id: "email",
    label: "Email",
    Icon: EnvelopeSimpleIcon,
    href: (url, text) => `mailto:?subject=${text}&body=${url}`,
  },
];
