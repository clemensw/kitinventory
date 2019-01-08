import React, { Component, useState, useEffect } from 'react'
import logo from './logo.svg'
import './App.css'
import { string, number } from 'prop-types'
import axios from 'axios'
import { Form, Input, Button, Grid } from 'semantic-ui-react'
import 'semantic-ui-css/semantic.min.css'


type SystemSummary = {
  pieces_total: number,
  piece_types: number,
  kits_total: number,
}

type InventorySummary = {
  [system_name: string]: SystemSummary  
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
  variant_id: string,
  name: string,
  expectedCount: number,
  count: number,
  category: string,
  category_name: string,
  image: string
}

type Event = {
  id: number,
  date: Date,
  eventType: string,
  kits: Kit[],
  parts: Part[]
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


/* class App extends Component {
  state = {
    summary: {
      fischertechnik: {
        pieces_total: 0,
        piece_types: 0,
        kits_total: 0,
      }
    }
  }
  render() {
    return (
      <div className="App">
        <Summary summary={this.state.summary} />
        <ul>
          <li>
            <NavButton name="add" />
          </li>
          <li>
            <NavButton name="inventory" />
          </li>
          <li>
            <NavButton name="Remove"></NavButton>
          </li>
        </ul>
        <AddForm />
      </div>
    );
  }
}
 */
function App() {
  const [summary, setSummary] = useState({
    fischertechnik: {
      pieces_total: 0,
      piece_types: 0,
      kits_total: 0,
    }
  })
  const [events, setEvents] = useState<Event[]>([])
  return (
      <div className="App">
        <Summary summary={summary} />
        <ul>
          <li>
            <NavButton name="add" />
          </li>
          <li>
            <NavButton name="inventory" />
          </li>
          <li>
            <NavButton name="Remove"></NavButton>
          </li>
        </ul>
        <AddForm />
      </div>
    )
}



function AddForm() {
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null)
  let activity
  if (selectedKit) {
    activity = <PartsSelector kit_id={selectedKit.id} />
  } else {
    activity = <KitSelector action={setSelectedKit} />
  }
  return (
    <div>
      <SystemSelector />
      <AcquisitionForm kit={selectedKit} />
      {activity}
    </div>
  )
}

function AcquisitionForm(props: {kit: Kit | null}) {
  return (
    <Grid stackable columns={2} >
    <Grid.Column>
    <Form action="Submit">
      <Form.Group>
        <Form.Input label="Acquired on" placeholder="Date" />
        <Form.Input label="Acquired from" placeholder="Name" />
        <Form.Select label="Type of Acquisition" placeholder="purchase?" options={[
          {key: "purchase", value: "purchase", text:"purchase"},
          {key:"gift", value:"gift", text: "gift"}]} />
        <Form.Select label="Condition" placeholder="Condition" options={[
          {key: "new", value:"new", text: "new"}, {key: "used", value: "used", text: "used"}]} />
      </Form.Group>
      <Form.Group>
        <Form.Input label="Name of Kit" value={props.kit && props.kit.name || ""} />
        <Form.Input label="Part Number" value={props.kit && props.kit.partNo || ""} />
        <Form.Input label="Proof of Purchase" placeholder="Code" />
        <Form.Button label="Add" content="Add Kit" active={props.kit != null} disabled={props.kit == null} />
      </Form.Group>
    </Form>
    </Grid.Column>
    <Grid.Column>
      <img src={props.kit && props.kit.image || ""} /> {props.kit && props.kit.partNo} {props.kit && props.kit.name}
    </Grid.Column>
    </Grid>
  )
}

function PartsSelector(props: { kit_id: number }) {
  const [parts, setParts] = useState<Part[]>([])
  const [adjustments, setAdjustments] = useState({})
  useEffect(() => {
    console.log("Fetching Partslist as an Effect")
    fetchPartslist(props.kit_id)
  },
  [props.kit_id])
  const addAdjustment = (id: number, adjustedBy: number, cause: string) => {
    setAdjustments({...adjustments, ...{[id]:{adjustment: adjustedBy, cause: cause}}})
  }
  const fetchPartslist = async (kit_id: number) => {
    let parts:Part[] = []
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
          let results = response.data.results.map((part: FtTicket) => ({
            id: parseInt(part.ticket_id),
            partNo: part.ft_article_nos,
            variantId: part.ft_variant_uuid,
            name: part.title,
            expectedCount: parseInt(part.ft_count),
            count: parseInt(part.ft_count),
            category: part.ft_cat_all,
            categoryName: part.ft_cat_all_formatted,
            image: '/thumbnail/' + part.ft_icon
          }))
          parts = parts.concat(results)
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
        {parts.map((part:{id: number, partNo: string, name: string, image: string, expectedCount: number, count: number}) =>
          <li key={part.id}>
            <PartListItem id={part.id} 
                          partNo={part.partNo}
                          name={part.name}
                          image={part.image}
                          expectedCount={part.expectedCount}
                          count={part.count}
                          addAdjustment={addAdjustment} />
          </li>)}
      </ul>
    </div>
  )
}

function PartListItem(props: {id: number, partNo: string, name: string, image: string, expectedCount: number, count: number, addAdjustment: any}) {
  return (
    <span>
      <img src={props.image} />
      {props.partNo}
      {props.name}
      <PartCountAdjuster expectedCount={props.expectedCount} count={props.count} addAdjustment={(adjustBy: number, cause: string) => props.addAdjustment(props.id, adjustBy, cause)} />
    </span>
  )
}


function PartCountAdjuster(props: {expectedCount: number, count: number, addAdjustment: any}) {
  const [count, setCount] = useState(props.expectedCount)
  //const adjust()
  let reduceCount = () => {
    if (count > 0) {
      setCount(count - 1)
    } else {console.log("reduceCount: count should not drop below 0: count: ${count}")}
  }
  
  let increaseCount = () => {
    setCount(count + 1)
  }
  let renderDelta = () => {
    let result = count - props.expectedCount
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
        <Button size="mini" icon="minus" onClick={reduceCount} disabled={count <=  0} />
        <Button size="mini" icon="plus" onClick={increaseCount} />
      </span>
      <span>
        {count} {renderDelta()}
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


function Summary(props:{summary: InventorySummary}) {
  let ft: SystemSummary = props.summary['fischertechnik']
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
          <td>{ft.pieces_total}</td>
          <td>{ft.kits_total}</td>
          <td>0</td>
        </tr>
      </tbody>
    </table>

  )
}

export default App;
