function Navigation({ activeTab, setActiveTab }) {
  const tabs = ['Inference', 'Performance', 'About'];
  
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-4xl font-bold">Phenotype ID</h1>
      <div className="flex space-x-10 text-gray-500 text-lg">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 pb-1 ${
              activeTab === tab ? 'text-black font-semibold border-black' : 'border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Navigation; 