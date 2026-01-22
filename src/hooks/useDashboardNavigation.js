import { useSearchParams } from 'react-router-dom';

export const useDashboardNavigation = (initialView = 'grid') => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Determine current view from URL or fallback
    const viewParam = searchParams.get('view');
    const currentView = viewParam || initialView;

    const navigateTo = (view) => {
        setSearchParams({ view });
    };

    const goBack = () => {
        // Clear the view param to return to default (grid)
        // We preserve other params if they exist? Typically just clearing view is enough here.
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('view');
        setSearchParams(newParams);
    };

    return {
        currentView,
        goBack,
        navigateTo
    };
};
