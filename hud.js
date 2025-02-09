// https://delvingdeveloper.com/posts/show-hide-elements-react-ultimate-guide
// with help from https://stackoverflow.com/questions/63484719/react-show-hide-element-on-button-click
// with help from react docs and tailwind css docs

import React, { useState } from "react";
import ReactDOM from "react-dom";

// function App() {
//   const [showContent, setShowContent] = useState(true);

//   const toggleContent = () => {
//     setShowContent(!showContent);
//   };

//   return (
//     <div>
//       <button onClick={toggleContent}>Toggle Content</button>
//       {showContent ? <p>Content is visible</p> : null}
//     </div>
//   );
// }

const HUD = () => {
  const [showActionPanel, setShowActionPanel] = useState(false);

  // Expose toggle function to the global scope
  useEffect(() => {
    window.toggleHUD = (state) => {
      setShowActionPanel(state);
    };
  }, []);

  return (
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col items-center w-3/5 max-w-lg">
      {/* Action Panel only shown when showActionPanel is true */}
      {showActionPanel && (
        <div className="bg-gray-700 p-3 rounded-lg mb-2 w-full flex justify-center space-x-4">
          <button className="bg-blue-500 text-white p-2 rounded-md w-16">⚔️</button>
          <button className="bg-blue-500 text-white p-2 rounded-md w-16">⛵</button>
        </div>
      )}

      {/* Troop Stats Panel */}
      <div className="flex space-x-4 bg-gray-700 p-2 rounded-lg w-full justify-around">
        <div className="text-white text-center">
          <p className="text-lg font-bold">10</p>
          <p className="text-sm">Infantry</p>
        </div>
        <div className="text-white text-center">
          <p className="text-lg font-bold">19</p>
          <p className="text-sm">Cavalry</p>
        </div>
        <div className="text-white text-center">
          <p className="text-lg font-bold">3</p>
          <p className="text-sm">Artillery</p>
        </div>
      </div>

      {/* Dice Section */}
      <div className="flex space-x-2 mt-2">
        <div className="bg-gray-600 text-white p-2 rounded-md w-10 h-10 flex items-center justify-center">🎲1</div>
        <div className="bg-gray-600 text-white p-2 rounded-md w-10 h-10 flex items-center justify-center">🎲2</div>
        <div className="bg-gray-600 text-white p-2 rounded-md w-10 h-10 flex items-center justify-center">🎲3</div>
      </div>
    </div>
  );
};

// Mount HUD into the game.html
document.addEventListener("DOMContentLoaded", () => {
  ReactDOM.render(<HUD />, document.getElementById("hud-root"));
});

export default HUD;



// const HUD = () => {
//   return (
//     <div >
//         {showActionPanel && (
//             <div className="bg-gray-700 p-3 rounded-lg mb-2 w-full flex justify-center space-x-4">
//             <button className="bg-blue-500 text-white p-2 rounded-md w-16">⚔️</button>
//             <button className="bg-blue-500 text-white p-2 rounded-md w-16">⛵</button>
//             </div>
//         )}

//         {/* Health container (black background) */}
//         <div id="health_container">
//             <img src="./img/health.png" alt="health-cross"/>
//               <span id="health_current">100</span> {/* Health value */}
//         </div>

//         {/* Weapon Ammo container (black background) */}
//         <div id="weapon_ammo_container">
//             <span id="weapon_ammo_clip">30</span> {/* Ammo Clip value */}
//             <span id="weapon_ammo_bag">/ 1000</span> {/* Ammo Bag value */}
//         </div>
//     </div>
//   );
// }

// export default App;

// import React from "react";

// const HUD = ({ showActionPanel }) => {
//   return (
//     <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col items-center w-3/5 max-w-lg">
//       {/* Action Panel (Attack, Sail) - Only shown when showActionPanel is true */}
//       {showActionPanel && (
//         <div className="bg-gray-700 p-3 rounded-lg mb-2 w-full flex justify-center space-x-4">
//           <button className="bg-blue-500 text-white p-2 rounded-md w-16">⚔️</button>
//           <button className="bg-blue-500 text-white p-2 rounded-md w-16">⛵</button>
//         </div>
//       )}

//       {/* Troop Stats Panel */}
//       <div className="flex space-x-4 bg-gray-700 p-2 rounded-lg w-full justify-around">
//         <div className="text-white text-center">
//           <p className="text-lg font-bold">10</p>
//           <p className="text-sm">Infantry</p>
//         </div>
//         <div className="text-white text-center">
//           <p className="text-lg font-bold">19</p>
//           <p className="text-sm">Cavalry</p>
//         </div>
//         <div className="text-white text-center">
//           <p className="text-lg font-bold">3</p>
//           <p className="text-sm">Artillery</p>
//         </div>
//       </div>

//       {/* Dice Section */}
//       <div className="flex space-x-2 mt-2">
//         <div className="bg-gray-600 text-white p-2 rounded-md w-10 h-10 flex items-center justify-center">🎲1</div>
//         <div className="bg-gray-600 text-white p-2 rounded-md w-10 h-10 flex items-center justify-center">🎲2</div>
//         <div className="bg-gray-600 text-white p-2 rounded-md w-10 h-10 flex items-center justify-center">🎲3</div>
//       </div>
//     </div>
//   );
// };

// export default HUD;