import React from 'react';
import { EditorProvider } from './context/EditorContext';
import EditorLayout from './components/EditorLayout';

const App: React.FC = () => {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  );
};

export default App;