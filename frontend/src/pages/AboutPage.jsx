import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-container">
      <h1 className="about-title">About Goldmine</h1>
      <div className="about-section-list">
        <div className="about-card">
          <h2 className="about-section-title">What is Goldmine?</h2>
          <p className="about-section-text"></p>
        </div>
        <div className="about-card">
          <h2 className="about-section-title">Key Features</h2>
          <ul className="about-feature-list">
          </ul>
        </div>
        <div className="about-card">
          <h2 className="about-section-title">How to Use</h2>
          <p className="about-section-text"></p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage; 