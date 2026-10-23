import { texts } from 'src/texts';
import classes from './LoadError.module.css';

/**
 * Shown instead of a white page when the data the whole application depends on (settings, profile) cannot be loaded.
 * Plain markup, because it is also shown outside of the Mantine theme (which needs the settings).
 */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={classes.root} role="alert">
      <p>{texts.common.loadFailed}</p>
      <button type="button" className={classes.button} onClick={onRetry}>
        {texts.common.tryAgain}
      </button>
    </div>
  );
}
