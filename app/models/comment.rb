class Comment
  include DataMapper::Resource
  
  # Definition of models
  property :id, Serial
  
  property :link_id, Integer
  property :author, String
  property :body, Text
  
  property :created_at, DateTime
  property :updated_at, DateTime
  
  # Associations
  belongs_to :link
  
  validates_present :author, :body, :link_id
end
