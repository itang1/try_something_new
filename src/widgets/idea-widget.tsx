import { Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, opacity, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type IdeaProps = {
  // Empty when there's nothing to suggest; the props are stored in UserDefaults, which can't hold null.
  id: string;
  name: string;
  meta: string;
  city: string;
  colors: string[];
};

const IdeaWidget = (props: IdeaProps, environment: WidgetEnvironment) => {
  'widget';
  const medium = environment.widgetFamily !== 'systemSmall';
  return (
    <VStack
      alignment="leading"
      spacing={4}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(
          { type: 'linearGradient', colors: props.colors, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
          'widget',
        ),
        widgetURL(props.id ? `trysomethingnew://activity/${props.id}` : 'trysomethingnew://'),
      ]}
    >
      <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle('#FFFFFF'), opacity(0.8)]}>
        {props.id ? 'IDEA FOR TODAY' : 'TRY SOMETHING NEW'}
      </Text>
      <Spacer />
      <Text modifiers={[font({ size: medium ? 22 : 18, weight: 'bold' }), foregroundStyle('#FFFFFF'), lineLimit(3)]}>
        {props.name}
      </Text>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#FFFFFF'), opacity(0.85), lineLimit(1)]}>
        {medium && props.city ? `${props.meta} · ${props.city}` : props.meta}
      </Text>
    </VStack>
  );
};

export default createWidget<IdeaProps>('IdeaWidget', IdeaWidget, {
  id: '',
  name: 'Open the app to get today’s idea',
  meta: 'One new thing a day',
  city: '',
  colors: ['#FF9500', '#FF2D55'],
});
