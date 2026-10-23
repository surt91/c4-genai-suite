import { ActionIcon, Alert, Button, Flex, Tooltip } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconClipboard, IconThumbDown } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { MessageDtoRatingEnum, ProfileDto } from 'src/api';
import { Icon } from 'src/components';
import { texts } from 'src/texts';
import { useStateMutateMessageRating } from '../../state/chat';
import classes from './ChatItem.module.css';

interface AIChatItemActionsProps {
  tokenCount?: number;
  messageId: number;
  renderAlways?: boolean;
  rating?: MessageDtoRatingEnum;
  user: ProfileDto;
  copyTextToClipboard: () => void;
}

const RATINGS: MessageDtoRatingEnum[] = ['incorrect', 'instructions_not_followed', 'insufficient_style', 'lazy', 'refused'];

const useVisibilityToggle = () => {
  const [isVisible, setIsVisible] = useState(false);
  return {
    isVisible,
    toggleVisibility: () => setIsVisible(!isVisible),
    setHiddenVisibility: () => setIsVisible(false),
  };
};

export const AIChatItemActions = ({
  messageId,
  copyTextToClipboard,
  rating,
  renderAlways,
  tokenCount,
  user,
}: AIChatItemActionsProps) => {
  const scrollTargetRef = useRef<HTMLDivElement>(null);
  const updateMessageRating = useStateMutateMessageRating(messageId);

  const { isVisible: isRatingSelectorVisible, toggleVisibility, setHiddenVisibility } = useVisibilityToggle();

  useEffect(() => {
    if (isRatingSelectorVisible && scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isRatingSelectorVisible]);

  if (messageId === 0) {
    return null;
  }
  return (
    <>
      <div className={clsx(classes.actions, { 'fade-in': renderAlways })} data-always={renderAlways || undefined}>
        <Tooltip label={texts.common.copy}>
          <ActionIcon
            color="gray"
            c="black"
            size={'lg'}
            variant="subtle"
            onClick={copyTextToClipboard}
            aria-label={texts.common.copy}
          >
            <IconClipboard size={16} />
          </ActionIcon>
        </Tooltip>
        {/* Answers can only be rated once they are stored, i.e. they have an ID from the server. */}
        {messageId > 0 && (
          <Tooltip label={texts.chat.rateMessage}>
            <ActionIcon
              onClick={toggleVisibility}
              color="gray"
              c="black"
              size={'lg'}
              variant="subtle"
              aria-label={texts.chat.rateMessage}
            >
              <IconThumbDown size={16} />
            </ActionIcon>
          </Tooltip>
        )}

        {user.isAdmin && tokenCount && tokenCount > 0 && (
          <div className={classes.tokenCount}>
            {tokenCount} {texts.common.tokens}
          </div>
        )}
      </div>

      {isRatingSelectorVisible && (
        <>
          <div className={classes.rating}>
            <Tooltip label={texts.chat.updateRating.close}>
              <ActionIcon
                variant="subtle"
                color="gray"
                c="black"
                size="lg"
                className={classes.ratingClose}
                onClick={setHiddenVisibility}
                aria-label={texts.chat.updateRating.close}
              >
                <Icon size={16} icon="close" />
              </ActionIcon>
            </Tooltip>

            <div className={classes.ratingHint}>{texts.chat.ratingHint}</div>

            <div className={classes.ratingOptions} data-pending={updateMessageRating.isPending || undefined}>
              {updateMessageRating.isSuccess && (
                <Alert
                  variant="light"
                  color="green"
                  title={<p>{texts.chat.updateRating.ratingSubmitted}</p>}
                  icon={<IconCircleCheck />}
                  p="xs"
                  w="100%"
                  classNames={{ title: classes.successText }}
                  styles={{ root: { outlineOffset: '-2px' } }}
                >
                  <p className={classes.successText}>{texts.chat.updateRating.thanksForYourValuableFeedback}</p>
                  <Flex>
                    <Button
                      variant="light"
                      size="compact-xs"
                      color="green"
                      mt="xs"
                      onClick={updateMessageRating.reset}
                      classNames={{ label: classes.successText }}
                      styles={{ root: { outlineOffset: '-2px' } }}
                    >
                      {texts.chat.updateRating.changeResponse}
                    </Button>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="green"
                      mt="xs"
                      onClick={setHiddenVisibility}
                      classNames={{ label: classes.successText }}
                      styles={{ root: { outlineOffset: '-2px' } }}
                    >
                      {texts.chat.updateRating.close}
                    </Button>
                  </Flex>
                </Alert>
              )}
              {updateMessageRating.isError && updateMessageRating.error instanceof Error && (
                <Alert
                  variant="light"
                  color="red"
                  title={<p>{texts.chat.updateRating.raitingFailed}</p>}
                  icon={<IconAlertCircle />}
                  p="xs"
                  w="100%"
                  classNames={{ title: classes.errorText }}
                >
                  <p className={classes.errorText}>{updateMessageRating.error.message}</p>
                  <Button
                    variant="light"
                    size="compact-xs"
                    color="red"
                    mt="xs"
                    onClick={() => updateMessageRating.variables && updateMessageRating.mutate(updateMessageRating.variables)}
                    classNames={{ label: classes.errorText }}
                    styles={{ root: { outlineOffset: '-2px' } }}
                  >
                    {texts.chat.updateRating.retry}
                  </Button>
                </Alert>
              )}
              {['idle', 'pending'].includes(updateMessageRating.status) &&
                RATINGS.map((ratingOption) => (
                  <Button
                    key={ratingOption}
                    variant="outline"
                    color="dark"
                    size="xs"
                    className={classes.ratingOption}
                    data-selected={rating === ratingOption || undefined}
                    onClick={() => updateMessageRating.mutate(ratingOption)}
                  >
                    {texts.chat.rating[ratingOption]}
                  </Button>
                ))}
            </div>
          </div>
          <div ref={scrollTargetRef}></div>
        </>
      )}
    </>
  );
};
