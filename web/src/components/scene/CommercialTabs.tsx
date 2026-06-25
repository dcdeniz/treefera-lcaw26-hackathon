import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MethodologyStrip } from '@/components/scene/MethodologyStrip'

type CustomerTarget = {
  name: string
  segment: string
  reason: string
  emails?: string[]
}

const currentCustomers: CustomerTarget[] = [
  {
    name: 'Wilmar International',
    segment: 'Palm trader',
    reason:
      'They have Kalimantan, Sabah, and Sarawak exposure and need auditable EUDR and NDPE proof for supplier catchments under cloud.',
    emails: ['csr@wilmar.com.sg', 'ir@wilmar.com.sg', 'palmandlaurics@wilmar.com.sg'],
  },
  {
    name: 'Bumitama Agri',
    segment: 'Borneo palm',
    reason:
      'They are concentrated in the Borneo palm frontier, so a 30-day SAR pilot can show estate and adjacent-area forest-loss risk directly.',
    emails: ['sustainability@bumitama-agri.com', 'investor.relations@bumitama-agri.com'],
  },
  {
    name: 'Kuala Lumpur Kepong',
    segment: 'Plantations',
    reason:
      'They have plantation compliance and investor-facing sustainability pressure, making a Borneo SAR evidence pilot a clean EUDR wedge.',
    emails: ['contactus@klk.com.my', 'corp.comms@klk.com.my', 'mktg@klk.com.my'],
  },
  {
    name: 'Permian Global / Katingan Mentaya',
    segment: 'Carbon MRV',
    reason:
      'They need independent monitoring for Central Kalimantan peat forest, leakage, and verification evidence where optical imagery is weak.',
    emails: ['info@permianglobal.com'],
  },
]

const potentialCustomers: CustomerTarget[] = [
  {
    name: 'RSPO GeoRSPO / GIS',
    segment: 'Certification',
    reason:
      'They could use L-band SAR alerts as an extra complaint, hotspot, and concession-risk layer for cloudy Borneo landscapes.',
  },
  {
    name: 'Earthqualizer, AidEnvironment, Mighty Earth',
    segment: 'NGO monitoring',
    reason:
      'They could buy or validate the layer because it turns suspected cloudy-frontier cases into polygons they can triage quickly.',
  },
  {
    name: 'Banks and insurers',
    segment: 'Risk screening',
    reason:
      'They could use supplier or concession alert history to price palm, timber, and carbon exposure before financing or renewal.',
  },
  {
    name: 'Downstream EU commodity buyers',
    segment: 'Procurement',
    reason:
      'They could buy after one operator proof point because EUDR pushes them to verify deforestation-free sourcing from high-risk regions.',
  },
]

export function CommercialTabs() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-8 md:py-10">
        <Tabs defaultValue="market" className="gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Commercial handoff
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl leading-tight">Market targets</h2>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.14em]"
                >
                  Borneo SAR
                </Badge>
              </div>
            </div>
            <TabsList variant="line" className="w-fit">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="build">Build</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="market">
            <div className="grid gap-4 lg:grid-cols-2">
              <CustomerBox
                title="Current customers to send now"
                description="Named accounts with direct Borneo exposure and immediate compliance or MRV pain."
                customers={currentCustomers}
              />
              <CustomerBox
                title="Potential customers"
                description="Buyer groups to open after the first operator or NGO proof point lands."
                customers={potentialCustomers}
              />
            </div>
          </TabsContent>

          <TabsContent value="build" className="-mx-4 -mb-8 md:-mx-8 md:-mb-10">
            <MethodologyStrip />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

function CustomerBox({
  title,
  description,
  customers,
}: {
  title: string
  description: string
  customers: CustomerTarget[]
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-2">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {customers.map((customer, index) => (
          <div key={customer.name}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm leading-snug">{customer.name}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {customer.reason}
                </p>
                {customer.emails && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customer.emails.map((email) => (
                      <Badge
                        key={email}
                        variant="outline"
                        className="h-auto max-w-full justify-start whitespace-normal break-all px-1.5 py-1 font-mono text-[10px] normal-case leading-tight tracking-normal"
                      >
                        {email}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Badge
                variant="secondary"
                className="w-fit shrink-0 font-mono text-[10px] uppercase tracking-[0.14em]"
              >
                {customer.segment}
              </Badge>
            </div>
            {index < customers.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
