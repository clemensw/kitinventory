import React, { Component, useState, useEffect } from 'react'
import logo from './logo.svg'
import './App.css'
import { string, number } from 'prop-types'
import axios from 'axios'
import { Form, Input, Button, Grid, InputOnChangeData } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'
import { ReadStream } from 'tty';

type PartMap = Map<number, Part>

type SystemSummary = {
  pieces: number,
  pieceTypes: number,
  kits: number,
}

type Collection = {
  summary: SystemSummary,
  pieces: PartMap
}

type InventorySummary = {
  [systemName: string]: SystemSummary  
}

type Inventory = {
  [systemName: string]: Collection
}

type Kit = {
  id: number,
  partNo: string,
  name: string,
  image: string,
  uri: string
}

type Part = {
  id: number,
  partNo: string,
  variantId: string,
  name: string,
  expectedCount: number,
  count: number,
  category: string,
  categoryName: string,
  image: string
}

type Event = {
  id: number,
  date: Date,
  eventType: string,
  system: string,
  metaData: object,
  kit: Kit,
  parts: PartMap
}

type FtTicket = {
  ticket_id: string,
  ft_article_nos: string,
  ft_variant_uuid: string,
  title: string,
  ft_count: string,
  ft_cat_all: string,
  ft_cat_all_formatted: string,
  ft_icon: string
  
}


function App() {
  const [inventory, setInventory] = useState({
    fischertechnik: {
      summary: {
        pieces: 0,
        pieceTypes: 0,
        kits: 0,
      },
      pieces: new Map<number, Part>()
    }
  })
  const [events, setEvents] = useState<Event[]>([])
  useEffect(
    () => {
      let nextSummary = events.reduce((prev: SystemSummary, event: Event) => {
        if (event.eventType === "acquisition") {
          prev['kits']++
          

        }
        return prev
      },
      {
        kits: 0,
        pieces: 0,
        pieceTypes: 0
      }
      )
      setInventory({fischertechnik: {summary: nextSummary, pieces: new Map<number, Part>()}})
    },
    [events]
  )
  const acquireKit = (metaData: object, kit:Kit, parts: Map<number, Part>) => {
    let now = new Date()
    let acquireEvent: Event = {
      id: now.getTime(),
      date: now,
      eventType: "acquisition",
      system: "fischertechnik",
      metaData,
      kit,
      parts
    }
    setEvents(events.concat(acquireEvent))
  }
  return (
      <div className="App">
        <Summary summary={inventory} />
        Events: {events.length}
        <AddForm action={acquireKit} />
      </div>
    )
}



function AddForm(props: {action: (metaData: object, kit: Kit, parts: Map<number, Part>) => void}) {
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null)
  const [parts, setParts] = useState<Map<number, Part>>(new Map<number, Part>())
  const registerAcquisistion = (metaData: object) => {if (selectedKit) {return props.action(metaData, selectedKit, parts)}}
  let activity
  if (selectedKit) {
    activity = <PartsSelector kit_id={selectedKit.id} parts={parts} setParts={setParts} />
  } else {
    activity = <KitSelector action={setSelectedKit} />
  }
  return (
    <div>
      <SystemSelector />
      <AcquisitionForm kit={selectedKit} registerAcquisition={registerAcquisistion} />
      {activity}
    </div>
  )
}

function AcquisitionForm(props: {kit: Kit | null, registerAcquisition: (metadata: object) => void}) {
  const [metadata, setMetadata] = useState({date: "", source: "", type: ""})
  const updateMetadata = (m: object) => setMetadata(Object.assign({}, metadata, m))
  const handleChange = (_e:any, {name, value}: InputOnChangeData) => {
    console.log(`Updating metadata ${name}: ${value}`)
    setMetadata(Object.assign({}, metadata, {[name]: value}))
    console.log(metadata)
  }

  const submitAction = (event: any, data:object) => {
    console.log(metadata)
    props.registerAcquisition(metadata)
  }
  return (
    <Grid stackable columns={2} >
    <Grid.Column>
    <Form onSubmit={submitAction}>
      <Form.Group>
        <Form.Input label="Acquired on" placeholder="Date" name= "date" value={metadata.date} onChange={handleChange} />
        <Form.Input label="Acquired from" placeholder="Name" name="source" value={metadata.source} onChange={handleChange} />
        <Form.Select label="Type of Acquisition" placeholder="purchase?" name="type" value={metadata.type}  options={[
          {key: "purchase", value: "purchase", text:"purchase"},
          {key:"gift", value:"gift", text: "gift"}]} />
        <Form.Select label="Condition" placeholder="Condition" options={[
          {key: "new", value:"new", text: "new"}, {key: "used", value: "used", text: "used"}]} />
      </Form.Group>
      <Form.Group>
        <Form.Input label="Name of Kit" value={props.kit && props.kit.name || ""} />
        <Form.Input label="Part Number" value={props.kit && props.kit.partNo || ""} />
        <Form.Input label="Proof of Purchase" placeholder="Code" />
        <Form.Button label="Add"
                     content="Add Kit"
                     active={props.kit != null}
                     disabled={props.kit == null} />
      </Form.Group>
    </Form>
    </Grid.Column>
    <Grid.Column>
      <img src={props.kit && props.kit.image || ""} /> {props.kit && props.kit.partNo} {props.kit && props.kit.name}
    </Grid.Column>
    </Grid>
  )
}

function PartsSelector(props: { kit_id: number, parts: Map<number, Part>, setParts: React.Dispatch<React.SetStateAction<Map<number, Part>>>}) {
  useEffect(() => {
    console.log("Fetching Partslist as an Effect")
    fetchPartslist(props.kit_id)
  }, [props.kit_id])
  let parts = props.parts
  let setParts = props.setParts
  let updatePart = (part: Part) => setParts(parts.set(part.id, part))
  const fetchPartslist = async (kit_id: number) => {
    let parts = new Map<number, Part>()
    try {
      for(let page=1, pages=1; page<=pages; page++) {
        console.log("Fetching parts page " + page)
        let response = await axios.get('/api/ft-partslist/' + kit_id, {
          params: {
            page: page
          }
        })
        if (response.data.status === "OK") {
          if (page == 1) { pages = response.data.cPages }
          console.log(response.data.results)
          for (var entry of response.data.results) {
            let part: Part = {
              id: parseInt(entry.ticket_id),
              partNo: entry.ft_article_nos,
              variantId: entry.ft_variant_uuid,
              name: entry.title,
              expectedCount: parseInt(entry.ft_count),
              count: parseInt(entry.ft_count),
              category: entry.ft_cat_all,
              categoryName: entry.ft_cat_all_formatted,
              image: '/thumbnail/' + entry.ft_icon
            }
            parts.set(part.id, part)
          }
        }
      }
    } catch(error) {
      console.log(error)
    }
    setParts(parts)
  }
  return (
    <div>
      <h2>{props.kit_id}</h2>

      <ul>
        {Array.from(parts.values()).map(part =>
          <li key={part.id}>
            <PartListItem part={part}
                          updatePart={updatePart}
                           />
          </li>)}
      </ul>
    </div>
  )
}

function PartListItem(props: {part: Part, updatePart: (part: Part) => void}) {
  let part = props.part
  let setCount = (count: number) => {
    part.count = count
    props.updatePart(part)
  }
  return (
    <span>
      <img src={part.image} />
      {part.partNo}
      {part.name}
      <PartCountAdjuster expectedCount={part.expectedCount} count={part.count} setCount = {setCount} />
    </span>
  )
}


function PartCountAdjuster(props: {expectedCount: number, count: number, setCount: (count: number) => void}) {
  let decrementCount = () => {
    if (props.count > 0) {
      props.setCount(props.count - 1)
    } else {console.log("reduceCount: count should not drop below 0: count: ${count}")}
  }
  let incrementCount = () => props.setCount(props.count + 1)
  let renderDelta = () => {
    let result = props.count - props.expectedCount
    if (result == 0) {
      return ""
    }
    else if (result < 0) {
      return `(${-1 * result} missing)`
    }
    else return `(${result} extra)`
  }
  
  return (
    <div>
      <span>
        <Button size="mini" icon="minus" onClick={decrementCount} disabled={props.count <=  0} />
        <Button size="mini" icon="plus" onClick={incrementCount} />
      </span>
      <span>
        {props.count} {renderDelta()}
      </span>
    </div>
  )
}

function KitSelector(props: { action: React.Dispatch<React.SetStateAction<Kit | null>> }) {
  const [kits, setKits] = useState([])
  const [searchString, setSearchString] = useState("")
  const action = (kit: Kit) => (_e:any, _d:any) => props.action(kit)
  const searchKit = async (searchString: string) => {
    try {
      const response = await axios.get('/api/tickets', {
        params: {
          drill_ft_cat_all: 653,
          fulltext: searchString
        }
      })
      if (response.data.status === "OK") {
        let results = response.data.results.map((kit: FtTicket) => ({
          id: kit.ticket_id,
          partNo: kit.ft_article_nos,
          name: kit.title,
          image: '/thumbnail/' + kit.ft_icon,
          uri: '/api/ft-partslist/' + kit.ticket_id
        }))
        setKits(results)
      }
    } catch(error) {
      console.log(error)
    }
  }
  const handleSearch = () => {
    searchKit(searchString)
  }
  const handleChange = (_e:any, data: {value: string}) => {setSearchString(data.value)}
  return (
    <div>
      <Form onSubmit={handleSearch}>
        <Form.Input icon="search" placeholder="Kit Name or Product Number" onChange={handleChange} />
      </Form>
      <ul>
        {kits.map((kit:{id: number, partNo: string, name: string, image: string, uri: string}) =>
          <li key={kit.id}>
            <KitListItem id={kit.id} action={action(kit)} partNo={kit.partNo} name={kit.name} image={kit.image} uri={kit.uri} />
          </li>)}
      </ul>
    </div>
  )
}

function KitListItem(props:{id: number, action:any, partNo: string, name: string, image: string, uri:string}) {
  return (
    <span>
      <img src={props.image} />
      {props.partNo}
      {props.name}
      <Button onClick={props.action} content="Select" size="mini" color="green" />
    </span>
  )
}

function SystemSelector() {
  return (
    <div>fischertechnik</div>
  )
}
function NavButton(props:{name: string}) {
  return (
    <button>{props.name}</button>
  )
}


function Summary(props:{summary: Inventory}) {
  let ft: SystemSummary = props.summary['fischertechnik']['summary']
  return (
    <table>
      <thead>
        <tr>
          <th>System</th>
          <th>Pieces</th>
          <th>Kits</th>
          <th>Models</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>fischertechnik</td>
          <td>{ft.pieces}</td>
          <td>{ft.kits}</td>
          <td>0</td>
        </tr>
      </tbody>
    </table>

  )
}

export default App;
