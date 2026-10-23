import { clsx } from 'clsx';
import { BucketDto, ExtensionDto, ExtensionSpecDto } from 'src/api';
import { texts } from 'src/texts';
import classes from './Extensions.module.css';
import { useListValues } from './hooks';

interface ExtensionCardProps {
  // The buckets.
  buckets: BucketDto[];

  // The spec.
  spec: ExtensionSpecDto;

  // The configured extension. Can be optional for available extensions.
  extension?: ExtensionDto;

  // Invoked when clicked.
  onClick?: (spec: ExtensionSpecDto, extension: ExtensionDto) => void;

  // Invoked when deleted.
  onDelete?: (extension: ExtensionDto) => void;
}

export function ExtensionCard(props: ExtensionCardProps) {
  const { buckets, extension, onClick, spec } = props;

  const listValues = useListValues(spec, buckets, extension);

  return (
    <li className={classes.card} onClick={() => onClick && onClick(spec, extension!)}>
      <div className={classes.cardBody}>
        {spec.logo && (
          <img
            className={classes.cardLogo}
            src={`data:image/svg+xml;utf8,${encodeURIComponent(spec.logo)}`}
            alt=""
            aria-hidden="true"
          />
        )}

        <div className={classes.cardContent}>
          <div>
            <h3 className={classes.cardTitle}>{spec.title}</h3>

            <div className={classes.cardDescription}>{spec.description}</div>
          </div>

          <div className={classes.badges}>
            {extension?.enabled === false && (
              <div className={clsx(classes.badge, classes.badgeError)}>{texts.common.disabled}</div>
            )}

            {spec.type !== 'other' && (
              <div className={classes.badge}>
                <div className={classes.truncate}>{spec.type}</div>
              </div>
            )}

            {listValues.map((value) => (
              <ul key={value} data-testid={'modelValues'} className={classes.badge}>
                <li className={classes.truncate}>{value}</li>
              </ul>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
