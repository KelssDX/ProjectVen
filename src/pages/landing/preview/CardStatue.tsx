export type StatueType = 'networking' | 'marketplace' | 'capital' | 'mentorship';

interface CardStatueProps {
  type: StatueType;
}

const TYPE_TO_IMAGE: Record<StatueType, string> = {
  networking: '/landing/NetworkingSatue.png',
  marketplace: '/landing/MarketplaceStatue.png',
  capital: '/landing/CapitalStatue.png',
  mentorship: '/landing/MentorshipStatue.png',
};

const CardStatue = ({ type }: CardStatueProps) => (
  <div
    className={`card-statue-slot card-statue-slot--${type} pointer-events-none select-none`}
    aria-hidden="true"
  >
    <img
      src={TYPE_TO_IMAGE[type]}
      alt=""
      draggable={false}
      className={`card-statue-image card-statue-image--${type}`}
    />
  </div>
);

export default CardStatue;
