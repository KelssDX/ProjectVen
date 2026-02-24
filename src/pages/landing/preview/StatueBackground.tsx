const TICKER_ITEMS = [
  'Business Networking',
  'Social Feed Posting',
  'Marketplace Products',
  'Marketplace Services',
  'Crowdfunding Campaigns',
  'Investor Deal Flow',
  'Mentorship Matching',
  'Profile Verification',
  'Direct Messaging',
  'Marketing Campaigns',
  'Trending Discovery',
];

export const StatueBackground = () => {
  return (
    <div
      className="absolute inset-x-0 pointer-events-none select-none"
      style={{ top: '59%', transform: 'translateY(-50%)', zIndex: 0 }}
    >
      <div
        style={{
          marginLeft: 'auto',
          marginRight: '-5%',
          width: '84%',
          maxWidth: '1000px',
          opacity: 0.54,
          filter: 'blur(1.8px) saturate(0.88) contrast(0.94)',
          mixBlendMode: 'multiply',
          maskImage: 'radial-gradient(circle at 38% 48%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0) 100%)',
          WebkitMaskImage: 'radial-gradient(circle at 38% 48%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.65) 56%, rgba(0,0,0,0) 100%)',
        }}
      >
        <img
          src="/landing/VendromeStatue.png?v=3"
          alt="Vendrome statue"
          style={{
            width: '230%',
            height: 'auto',
            objectFit: 'contain',
            transform: 'scale(1.16)',
          }}
          draggable={false}
        />
      </div>

      <div className="vendrome-news-ticker" aria-hidden="true">
        <div className="vendrome-news-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <span key={`${item}-${idx}`} className="vendrome-news-item">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatueBackground;
