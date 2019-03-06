import React from 'react'
import * as R from 'ramda'
import { Link } from 'react-router-dom'
// Helpers
import classNames from 'classnames/bind'
import apiCall from '../api-call'
import { subscribeUsers, unsubscribeUsers } from '../globals'
// Components
import ContainerCard from './container-card'
import slackSignButton from './sign-in-slack'
// Styles
import styles from '../scss/views/dashboard-view.scss'


const css = classNames.bind(styles)

class Dashboard extends React.Component {
  constructor(props) {
    super(props)

    this.refreshInstances = this.refreshInstances.bind(this)
    this.removeContainerCallback = this.removeContainerCallback.bind(this)

    this.state = {
      instances: [],
      slackAuth: false,
    }
  }

  async componentDidMount() {
    this.userSub = subscribeUsers(this.refreshInstances)
    const { slackAuth } = await apiCall('GET', '/slack/auth')
    this.setState({ slackAuth })
  }

  componentWillUnmount() {
    unsubscribeUsers(this.userSub)
  }

  async refreshInstances() {
    const instances = await apiCall('GET', '/instances')
    this.setState({ instances })
  }

  removeContainerCallback(containerName) {
    this.setState((prevState) => {
      // TODO: should fetch and not just filter
      const instancesWithoutDeletedOne = R.reject(
        instance => instance.name === containerName,
        prevState.instances
      )
      return { instances: instancesWithoutDeletedOne }
    })
  }

  render() {
    const { instances } = this.state

    function noInstances() {
      if (instances.length === 0) {
        return (
          <p>
            No instances created.
            Go ahead and create one by clicking on the &quot;New instance&quot; button.
          </p>
        )
      }
    }

    return (
      <>
        <div className={css('top-section')}>
          <h2>Dashboard</h2>
          {this.state.slackAuth ? null : slackSignButton()}
          <Link to="/create">
            <button
              className={css('create-button')}
              type="button"
            >New instance
            </button>
          </Link>
        </div>
        <div className={css('instances-container')}>
          <h2>Your instances</h2>
          <div className={css('reverse')}>
            {
              instances.map(instance => (
                <ContainerCard
                  key={instance.id}
                  removeContainerCallback={this.removeContainerCallback}
                  instance={instance}
                />
              ))
            }
          </div>
          { noInstances() }
        </div>
      </>
    )
  }
}

export default Dashboard
