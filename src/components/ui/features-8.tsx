import { Card, CardContent } from '@/components/ui/card'
import { Shield, Users } from 'lucide-react'

export function Features() {
    return (
        <section className="py-16 md:py-28">
            <div className="mx-auto max-w-3xl lg:max-w-5xl px-6">
                <div className="relative">
                    <div className="relative z-10 grid grid-cols-6 gap-3">
                        <Card className="relative col-span-full flex overflow-hidden lg:col-span-2">
                            <CardContent className="relative m-auto size-fit pt-6">
                                <div className="relative flex h-24 w-56 items-center">
                                    <span className="mx-auto block w-fit text-5xl font-semibold">5</span>
                                    <span className="ml-2 text-muted-foreground">components</span>
                                </div>
                                <h2 className="mt-6 text-center text-3xl font-semibold">Structured</h2>
                            </CardContent>
                        </Card>
                        <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2">
                            <CardContent className="pt-6">
                                <div className="relative mx-auto flex aspect-square size-32 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border">
                                    <Shield className="m-auto size-12 text-primary" strokeWidth={1} />
                                </div>
                                <div className="relative z-10 mt-6 space-y-2 text-center">
                                    <h2 className="text-lg font-medium">Evidence-led</h2>
                                    <p className="text-muted-foreground">Desk review, key-informant interviews and focus groups feed a single structured judgement.</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2">
                            <CardContent className="pt-6">
                                <div className="relative mx-auto flex aspect-square size-32 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border">
                                    <Users className="m-auto size-12 text-primary" strokeWidth={1} />
                                </div>
                                <div className="relative z-10 mt-6 space-y-2 text-center">
                                    <h2 className="text-lg font-medium">Built for children</h2>
                                    <p className="text-muted-foreground">Designed to plan school eye-health programmes that reach every child, everywhere.</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="relative col-span-full overflow-hidden lg:col-span-3">
                            <CardContent className="grid pt-6 sm:grid-cols-2">
                                <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                                    <div className="relative flex aspect-square size-12 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border">
                                        <Shield className="m-auto size-5 text-primary" strokeWidth={1} />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-lg font-medium">Feasibility first</h2>
                                        <p className="text-muted-foreground">Spot the blockers before investing in a full survey — and spare unnecessary expense.</p>
                                    </div>
                                </div>
                                <div className="mt-6 sm:ml-6 rounded-tl-2xl border-l border-t p-6">
                                    <p className="text-sm text-muted-foreground">"Effective school eye-health programmes are a critical part of any health system."</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="relative col-span-full overflow-hidden lg:col-span-3">
                            <CardContent className="grid h-full pt-6 sm:grid-cols-2">
                                <div className="relative z-10 flex flex-col justify-between space-y-12 lg:space-y-6">
                                    <div className="relative flex aspect-square size-12 rounded-full border before:absolute before:-inset-2 before:rounded-full before:border">
                                        <Users className="m-auto size-6 text-primary" strokeWidth={1} />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-lg font-medium">Submitted automatically</h2>
                                        <p className="text-muted-foreground">Complete the module online and it is emailed straight to the Peek SEHRA team — no PDFs to wrangle.</p>
                                    </div>
                                </div>
                                <div className="relative mt-6 flex flex-col justify-center space-y-6 py-6 sm:-my-6 sm:-mr-6">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="block rounded border px-2 py-1 text-xs shadow-sm">Desk review</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="block rounded border px-2 py-1 text-xs shadow-sm">KIIs &amp; FGDs</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="block rounded border px-2 py-1 text-xs shadow-sm">Submit</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </section>
    )
}
