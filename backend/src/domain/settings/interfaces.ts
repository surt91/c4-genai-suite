import { ChatSuggestion, SiteLink } from '../shared';

export interface Settings {
  // Language that the app will use
  language: string;

  // The primary color used for buttons and links.
  primaryColor: string;

  // The primary content color used for buttons and links.
  primaryContentColor: string;

  // The name of the agent.
  agentName?: string;

  // The footer text to be shown below the chat.
  chatFooter?: string;

  // The suggestions to be shown for the chat.
  chatSuggestions?: ChatSuggestion[];

  // The suggestions to be shown for the chat.
  siteLinks?: SiteLink[];

  // Some custom css.
  customCss?: string;

  // Welcome text for the login screen.
  welcomeText?: string;

  // The name of the app.
  name: string;

  logo?: string;
  avatarLogo?: string;
  backgroundLogo?: string;
}
