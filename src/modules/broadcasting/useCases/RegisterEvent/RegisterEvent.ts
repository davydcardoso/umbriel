import { Either, left, right } from '@core/logic/Either'
import { Event } from '@modules/broadcasting/domain/event/event'
import { Type, ValidEventTypes } from '@modules/broadcasting/domain/event/type'
import { Recipient } from '@modules/broadcasting/domain/recipient/recipient'
import { IRecipientsRepository } from '@modules/broadcasting/repositories/IRecipientsRepository'

import { InvalidEventError } from './errors/InvalidEventError'

type RegisterEventRequest = {
  messageId: string
  contactId: string
  event: {
    type: ValidEventTypes
    meta?: any
  }
}

type RegisterEventResponse = Either<InvalidEventError, Event>

export class RegisterEvent {
  constructor(private recipientsRepository: IRecipientsRepository) {}

  async execute({
    contactId,
    messageId,
    event,
  }: RegisterEventRequest): Promise<RegisterEventResponse> {
    let recipient = await this.recipientsRepository.findByMessageAndContactId({
      contactId,
      messageId,
    })

    if (!recipient) {
      recipient = Recipient.create({
        contactId,
        messageId,
      })
    }

    const eventTypeOrError = Type.create(event.type)

    if (eventTypeOrError.isLeft()) {
      return left(new InvalidEventError())
    }

    const incomingEventOrError = Event.create({
      recipientId: recipient.id,
      type: eventTypeOrError.value,
      meta: event.meta,
    })

    if (incomingEventOrError.isLeft()) {
      return left(new InvalidEventError())
    }

    recipient.addEvent(incomingEventOrError.value)

    await this.recipientsRepository.saveWithEvents(recipient)

    return right(incomingEventOrError.value)
  }
}