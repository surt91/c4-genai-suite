import { clsx } from 'clsx';
import { ConfigurationDto } from 'src/api';
import { Theme } from 'src/hooks';
import { useIsPhone } from 'src/hooks/useIsCompact';
import classes from './Suggestions.module.css';

interface SuggestionsProps {
  configuration?: ConfigurationDto;
  theme: Theme;
  onSelect: (input: string) => void;
}

export function Suggestions(props: SuggestionsProps) {
  const { configuration, onSelect, theme } = props;
  const isPhone = useIsPhone();

  const suggestions = [...(theme.chatSuggestions || []), ...(configuration?.chatSuggestions || [])];

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={clsx(classes.grid, !isPhone && classes.columns)}>
      {suggestions.map((x, i) => (
        <button type="button" className={classes.suggestion} key={i} onClick={() => onSelect(x.text)}>
          <div>{x.title}</div>

          <div className={classes.subtitle}>{x.subtitle}</div>
        </button>
      ))}
    </div>
  );
}
