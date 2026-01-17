
'use client'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarTrigger
} from "@/components/ui/sidebar"
import { useNavigation } from '@/lib/navigation'

export function AppPageHeader() {
    const { getBreadcrumbs } = useNavigation()
    
    return (
        <div className="inline-flex items-center">
            <SidebarTrigger className="-ml-1" />
            <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
                <BreadcrumbList>
                    {getBreadcrumbs().map(crumb => (
                        <>
                            <BreadcrumbItem className="hidden md:block" key={crumb.url}>
                                <BreadcrumbLink href={crumb.url}>
                                    {crumb.title}
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                        </>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>


        </div>
    )
}