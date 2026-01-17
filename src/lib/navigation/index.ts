/**
 * Navigation Context and Utilities
 * 
 * Provides centralized navigation data management across the application.
 * Includes organization context, user roles, and active state tracking.
 * 
 * @example
 * ```tsx
 * // In a component
 * import { useNavigation } from '@/lib/navigation';
 * 
 * function MyComponent() {
 *   const { navMain, isPathActive, getBreadcrumbs, organization } = useNavigation();
 *   
 *   return (
 *     <div>
 *       {getBreadcrumbs().map(crumb => (
 *         <a key={crumb.url} href={crumb.url}>{crumb.title}</a>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

export { NavDataProvider, useNavigation } from './context';
export type { NavigationData } from './context';

