import { useState } from 'react';

export const useDashboardNavigation = (initialView = 'grid') => {
    const [currentView, setCurrentView] = useState(initialView);

    const goBack = () => setCurrentView('grid');
    const navigateTo = (view) => setCurrentView(view);

    return {
        currentView,
        goBack,
        navigateTo
    };
};
