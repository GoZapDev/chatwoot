module Concerns::Agentable
  extend ActiveSupport::Concern

  DEFAULT_TEMPERATURE = 0.5

  def agent
    route = agent_route
    Agents::Agent.new(
      name: agent_name,
      instructions: ->(context) { agent_instructions(context) },
      tools: agent_tools,
      model: route[:model],
      provider: route[:provider],
      # Custom installation-configured models (e.g. a self-hosted OpenAI-compatible
      # endpoint) aren't part of RubyLLM's built-in model registry, so validation
      # must be skipped for them or every request would fail with ModelNotFoundError.
      assume_model_exists: route[:source] == :installation_override,
      temperature: temperature.presence&.to_f || DEFAULT_TEMPERATURE,
      response_schema: agent_response_schema
    )
  end

  def agent_instructions(context = nil, prompt_template: template_name)
    enhanced_context = prompt_context

    if context
      state = context.context[:state] || {}
      config = state[:assistant_config] || {}
      enhanced_context = enhanced_context.merge(
        current_time: format_current_time(state[:timezone]),
        conversation: state[:conversation] || {},
        contact: config['feature_contact_attributes'].present? ? state[:contact] : nil,
        campaign: state[:campaign] || {},
        message_length_limit: state[:message_length_limit]
      )
    end

    Captain::PromptRenderer.render(prompt_template, enhanced_context.with_indifferent_access)
  end

  def agent_model
    agent_route[:model]
  end

  private

  def agent_route
    @agent_route ||= begin
      route = Llm::FeatureRouter.resolve(feature: 'assistant', account: account)
      legacy_model = installation_model.presence

      if route[:source] == :account_override || account&.feature_enabled?('captain_integration_v2') || legacy_model.blank?
        route
      else
        route.merge(model: legacy_model, provider: 'openai', source: :installation_override)
      end
    end
  end

  def agent_name
    raise NotImplementedError, "#{self.class} must implement agent_name"
  end

  def template_name
    self.class.name.demodulize.underscore
  end

  def agent_tools
    []  # Default implementation, override if needed
  end

  def installation_model
    InstallationConfig.find_by(name: 'CAPTAIN_OPEN_AI_MODEL')&.value
  end

  def agent_response_schema
    Captain::ResponseSchema
  end

  def format_current_time(timezone)
    tz = ActiveSupport::TimeZone[timezone] if timezone.present?
    time = tz ? Time.current.in_time_zone(tz) : Time.current
    time.strftime('%A, %B %d, %Y %I:%M %p %Z')
  end

  def prompt_context
    raise NotImplementedError, "#{self.class} must implement prompt_context"
  end
end
