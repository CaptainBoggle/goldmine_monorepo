import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutPage from '../AboutPage';

describe('AboutPage', () => {
  it('renders the main title', () => {
    render(<AboutPage />);
    expect(screen.getByText('About Goldmine')).toBeInTheDocument();
  });

  it('renders phenotype explanation section', () => {
    render(<AboutPage />);
    expect(screen.getByText('What are Phenotypes?')).toBeInTheDocument();
  });

  it('renders what is Goldmine section', () => {
    render(<AboutPage />);
    expect(screen.getByText('What is Goldmine?')).toBeInTheDocument();
  });

  it('renders model evaluation process section', () => {
    render(<AboutPage />);
    expect(screen.getByText('Model Evaluation Process')).toBeInTheDocument();
  });

  it('renders gold corpus section', () => {
    render(<AboutPage />);
    expect(screen.getByText('Gold Corpus - The Answer Booklet')).toBeInTheDocument();
  });

  it('renders key features section', () => {
    render(<AboutPage />);
    expect(screen.getByText('Key Features')).toBeInTheDocument();
  });

  it('renders how to use section', () => {
    render(<AboutPage />);
    expect(screen.getByText('How to Use')).toBeInTheDocument();
  });
}); 