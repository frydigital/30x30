
'use client'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarTrigger
} from "@/components/ui/sidebar"
import { useNavigation } from '@/lib/navigation'
import { Fragment } from 'react'

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
                    {getBreadcrumbs().map((crumb, index) => (
                        <Fragment key={index}>
                            <BreadcrumbItem className="hidden md:block">
                                <BreadcrumbLink href={crumb.url}>
                                    {crumb.title}
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            {index < getBreadcrumbs().length - 1 && (
                                <BreadcrumbSeparator className="hidden md:block" />
                            )}
                        </Fragment>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    )
}