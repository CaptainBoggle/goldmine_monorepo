function Navigation({ activeTab, setActiveTab }) {
  const tabs = ['Inference', 'Performance', 'About'];
  
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Phenotype ID</h1>
      <div className="flex justify-center sm:justify-end w-full sm:w-auto">
        <div className="flex space-x-6 sm:space-x-8 lg:space-x-10 text-gray-500 text-base sm:text-lg relative">
          {/* Left spacing - 10% */}
          <div className="w-[10%] sm:w-16 lg:w-20"></div>
          
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-1 transition-all duration-300 ease-in-out transform hover:scale-105 ${
                activeTab === tab 
                  ? 'text-blue-600 font-semibold border-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-blue-300'
              }`}
            >
              {tab}
            </button>
          ))}
          
          {/* Right spacing - 10% */}
          <div className="w-[10%] sm:w-16 lg:w-20"></div>
        </div>
      </div>
    </div>
  );
}

export default Navigation; 