class Messages::DispatchCreatedEventJob < ApplicationJob
  queue_as :critical

  def perform(message_id)
    message = Message.find_by(id: message_id)
    return if message.blank?

    Rails.configuration.dispatcher.dispatch(
      Events::Types::MESSAGE_CREATED,
      Time.zone.now,
      message: message,
      performed_by: nil
    )
  end
end
