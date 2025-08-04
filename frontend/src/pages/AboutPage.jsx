import './AboutPage.css';

function AboutPage() {
  return (
    <div className="about-container">
      <h1 className="about-title">About Goldmine</h1>
      <div className="about-section-list">
        <div className="about-card">
          <h2 className="about-section-title">What are Phenotypes?</h2>
          <p className="about-section-text">
            Phenotypes are observable characteristics or traits of an organism, such as physical features, 
            behaviors, or biochemical properties. In medical and biological contexts, phenotypes often refer 
            to disease symptoms, physical abnormalities, or clinical manifestations. For example, phenotypes 
            might include symptoms like "fever," "muscle weakness," or "developmental delay."
          </p>
        </div>
        
        <div className="about-card">
          <h2 className="about-section-title">What is Goldmine?</h2>
          <p className="about-section-text">
            Goldmine is a comprehensive evaluation platform for phenotype recognition tools and models. 
            Our system allows researchers and developers to test and compare different machine learning 
            models that can automatically identify and extract phenotype mentions from biomedical text.
          </p>
        </div>
        
        <div className="about-card">
          <h2 className="about-section-title">Model Evaluation Process</h2>
          <p className="about-section-text">
            We evaluate phenotype recognition models by comparing their predictions against carefully 
            curated "gold standard" annotations. The evaluation process involves:
          </p>
          <ul className="about-feature-list">
            <li><strong>Model Prediction:</strong> Models analyze biomedical text to identify phenotype mentions</li>
            <li><strong>Gold Standard Comparison:</strong> Predictions are compared against expert annotations</li>
            <li><strong>Performance Metrics:</strong> We calculate accuracy, precision, recall, F1-score, and Jaccard similarity</li>
            <li><strong>Comprehensive Analysis:</strong> Results help determine which models perform best for phenotype recognition</li>
          </ul>
        </div>
        
        <div className="about-card">
          <h2 className="about-section-title">Gold Corpus - The Answer Booklet</h2>
          <p className="about-section-text">
            Our gold corpus consists of expert-annotated biomedical documents in BioC XML format. 
            These annotations serve as the "answer booklet" for evaluating model performance. Each 
            document contains:
          </p>
          <ul className="about-feature-list">
            <li><strong>Original Text:</strong> Biomedical literature or clinical notes</li>
            <li><strong>Expert Annotations:</strong> Phenotype mentions identified by domain experts</li>
            <li><strong>Standardized Format:</strong> BioC XML format for consistent evaluation</li>
            <li><strong>Quality Assurance:</strong> Rigorous annotation guidelines and review processes</li>
          </ul>
        </div>
        
        <div className="about-card">
          <h2 className="about-section-title">Key Features</h2>
          <ul className="about-feature-list">
            <li><strong>Multiple Model Support:</strong> Test and compare different phenotype recognition models</li>
            <li><strong>Comprehensive Metrics:</strong> Evaluate performance using multiple standard metrics</li>
            <li><strong>Visual Results:</strong> Interactive charts and tables for easy result interpretation</li>
            <li><strong>Batch Processing:</strong> Handle large corpora efficiently</li>
            <li><strong>Real-time Evaluation:</strong> Get results immediately after model predictions</li>
          </ul>
        </div>
        
        <div className="about-card">
          <h2 className="about-section-title">How to Use</h2>
          <p className="about-section-text">
            To evaluate a phenotype recognition model:
          </p>
          <ol className="about-feature-list">
            <li><strong>Select a Model:</strong> Choose from available phenotype recognition tools</li>
            <li><strong>Choose a Corpus:</strong> Select a gold standard corpus for evaluation</li>
            <li><strong>Run Predictions:</strong> Let the model process the text and identify phenotypes</li>
            <li><strong>View Results:</strong> Compare predictions against gold standard annotations</li>
            <li><strong>Analyze Performance:</strong> Review metrics and visualizations to understand model strengths and weaknesses</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default AboutPage; 